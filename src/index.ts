import * as _         from 'underscore';;

import * as kiws      from '@nodeswork/kiws';
import * as applet    from '@nodeswork/applet';
import { metrics }    from '@nodeswork/utils';

import * as def       from './def';
import * as errors    from './errors';
import * as constants from './constants';

const GOLD_PLAYER_CONTRACT_RESOURCE_ID        = 5001006;
const GOLD_COACH_CONTRACT_RESOURCE_ID         = 5001013;
const GOLD_PLAYER_CONTRACT_DUPLICATE_ITEM_ID  = 116603334268;

const STATUS_ERROR_CODE_NOT_ENOUGH_BUDGET     = 470; // ?
const STATUS_ERROR_CODE_PERMISSION_DENIEND    = 461; // ?

const TRADE_STATES = {
  ACTIVE:   'active',
  EXPIRED:  'expired',
  CLOSED:   'closed',
};

@applet.WorkerProvider({})
class FutAutoTrader {

  @kiws.Input()  fifaFut18Account:  applet.FifaFut18Account;

  @kiws.Input({ type: 'FifaFut18Account' })
  _fifaFut18Accounts: applet.FifaFut18Account[];
  accountInfos:       { [name: string]: def.FifaFut18AccountInfo } = {};

  fifaFut18Accounts:  applet.FifaFut18Account[] = []; // account status is 'ok'

  @kiws.Inject() logger:            applet.ContextLogger;
  @kiws.Inject() execution:         applet.ExecutionMetrics;

  private async intializeAccountInfo() {
    for (const account of this._fifaFut18Accounts) {
      try {
        const userMassInfo = await account.getUserMassInfo();
        const listingSizeEntry = _.find(
          userMassInfo.pileSizeClientData.entries, (x) => x.key === 2,
        );
        this.accountInfos[account.name] = {
          credits:      userMassInfo.userInfo.credits,
          listingSize:  listingSizeEntry.value,
          listedItems:  listingSizeEntry.value,
        };
        this.fifaFut18Accounts.push(account);
        await this.emitMetrics(
          account,
          metrics.dimensions(constants.metrics.dimensions.ACCOUNT_STATUS, 'ok'),
          constants.metrics.ACCOUNTS,
          metrics.Average(1),
        );
        await this.emitMetrics(
          account, {}, constants.metrics.CREDITS,
          metrics.Last(userMassInfo.userInfo.credits),
        );
        await this.emitMetrics(
          account, {}, constants.metrics.LISTING_SIZE,
          metrics.Average(listingSizeEntry.value),
        );
        this.logger.info('Get Account Info Success', { account: account.name });
      } catch (e) {
        this.logger.error('Get Account Info Failed', e);
        await this.emitMetrics(
          account,
          metrics.dimensions(
            constants.metrics.dimensions.ACCOUNT_STATUS, 'err',
          ),
          constants.metrics.ACCOUNTS,
          metrics.Average(1),
        );
      }
    }
  }

  @applet.Worker({
    name:      'Trade',
    schedule:  '0 * * * * *',
    default:   true,
  })
  async trade() {
    this.logger.info('Trade starts');
    await this.execution.updateMetrics({
      name:   constants.metrics.TRADE_REQUEST,
      value:  metrics.Count(1),
    });

    await this.intializeAccountInfo();

    for (const account of this.fifaFut18Accounts) {
      await this.sendPurchasedContractsToClub(account);
      await this.removeOrRelistSellings(account);
      await this.listContracts(account);
    }

    for (let idx = 0; idx < this.fifaFut18Accounts.length; idx++) {
      await this.tradeGoldContract(this.fifaFut18Accounts[idx], idx);
    }

    this.logger.info('Trade ends successfully');
  }

  private async emitMetrics<T>(
    account:     applet.FifaFut18Account,
    dimensions:  metrics.MetricsDimensions,
    name:        string,
    value:       metrics.MetricsValue<T>,
  ) {
    const d = metrics.dimensions(
      constants.metrics.dimensions.ACCOUNT, account.name,
    );
    await this.execution.updateMetrics({
      dimensions: _.extend(d, dimensions), name, value,
    });
  }

  private async removeOrRelistSellings(account: applet.FifaFut18Account) {
    this.logger.info('RemoveOrRelistSellings', { account: account.name });

    const tradePile = await account.getTradePile();

    const contracts = _.filter(tradePile.auctionInfo, (auction) => {
      return this.isGoldContract(auction.itemData);
    });

    this.accountInfos[account.name].listedItems = tradePile.auctionInfo.length;

    const groupedContractsByTradeState = _.groupBy(contracts, (auction) => {
      return auction.tradeState;
    });

    for (const tradeState of [ 'active', 'closed', 'expired' ]) {
      const goldPlayers = _.filter(
        contracts,
        (a) => (
          a.tradeState === tradeState &&
          a.itemData.resourceId === GOLD_PLAYER_CONTRACT_RESOURCE_ID
        ),
      );
      const goldCoaches = _.filter(
        contracts,
        (a) => (
          a.tradeState === tradeState &&
          a.itemData.resourceId === GOLD_COACH_CONTRACT_RESOURCE_ID
        ),
      );

      if (goldPlayers.length) {
        await this.emitMetrics(
          account,
          metrics.dimensions(
            constants.metrics.dimensions.CONTRACT_TYPE,
            constants.metrics.CONTRACT_TYPES.GOLD_PLAYER,
            constants.metrics.dimensions.TRADE_STATE,
            tradeState,
          ),
          constants.metrics.LISTING_CONTRACTS,
          metrics.Count(goldPlayers.length),
        );
      }
      if (goldCoaches.length) {
        await this.emitMetrics(
          account,
          metrics.dimensions(
            constants.metrics.dimensions.CONTRACT_TYPE,
            constants.metrics.CONTRACT_TYPES.GOLD_COACH,
            constants.metrics.dimensions.TRADE_STATE,
            tradeState,
          ),
          constants.metrics.LISTING_CONTRACTS,
          metrics.Count(goldCoaches.length),
        );
      }
    }

    const info = _.mapObject(
      groupedContractsByTradeState, (vals) => vals.length,
    );
    this.logger.info('Trading Status', info);

    const expiredContracts = groupedContractsByTradeState[TRADE_STATES.EXPIRED];
    const soldContracts = groupedContractsByTradeState[TRADE_STATES.CLOSED];

    if (soldContracts && soldContracts.length > 0) {
      this.logger.info('Remove sold contracts');
      await account.deleteSold();
    }

    if (expiredContracts && expiredContracts.length >= 10) {
      this.logger.info('Relisting expired contracts');
      const resp = await account.relist();
      this.logger.info('Relisting result', resp);

      await this.emitMetrics(
        account, {},
        constants.metrics.RELIST, metrics.Count(1),
      );
    }

    this.logger.info('RemoveOrRelistSellings finished');
  }

  private async listContracts(account: applet.FifaFut18Account) {
    this.logger.info('ListContracts', { account: account.name });

    const dc = await account.getClubDevelopmentConsumables();

    const goldPlayers = _.find(
      dc.itemData,
      (d) => d.resourceId === GOLD_PLAYER_CONTRACT_RESOURCE_ID
    );
    const goldCoaches = _.find(
      dc.itemData,
      (d) => d.resourceId === GOLD_COACH_CONTRACT_RESOURCE_ID
    );

    await this.emitMetrics(
      account,
      metrics.dimensions(
        constants.metrics.dimensions.CONTRACT_TYPE,
        constants.metrics.CONTRACT_TYPES.GOLD_PLAYER,
      ),
      constants.metrics.OWN_CONTRACTS,
      metrics.Last(goldPlayers ? goldPlayers.count : 0),
    );

    await this.emitMetrics(
      account,
      metrics.dimensions(
        constants.metrics.dimensions.CONTRACT_TYPE,
        constants.metrics.CONTRACT_TYPES.GOLD_COACH,
      ),
      constants.metrics.OWN_CONTRACTS,
      metrics.Last(goldCoaches ? goldCoaches.count : 0),
    );

    const targetContract = _.find(
      dc.itemData,
      (d) => (
        d.resourceId === GOLD_PLAYER_CONTRACT_RESOURCE_ID
        || d.resourceId === GOLD_COACH_CONTRACT_RESOURCE_ID
      ),
    );

    if (targetContract == null || targetContract.count <= 0) {
      this.logger.info('No gold player contract in club');
      return;
    }
    const accountInfo = this.accountInfos[account.name];
    if (accountInfo.listedItems >= accountInfo.listingSize) {
      this.logger.warn('No room to list');
      return;
    }

    const resp = await account.sendResourceToTransferList(
      [ targetContract.resourceId ],
    );
    const itemId = resp.itemData[0].id;

    if (!resp.itemData[0].success) {
      this.logger.error(
        'Send gold player contract to transfer list failed', targetContract,
      );
      return;
    }

    const listResult = await account.list({
      itemId,
      buyNowPrice:  300,
      startingBid:  250,
      duration:     3600,
    });

    await this.emitMetrics(
      account,
      metrics.dimensions(
        constants.metrics.dimensions.CONTRACT_TYPE,
        targetContract.resourceId === GOLD_PLAYER_CONTRACT_RESOURCE_ID ?
          constants.metrics.CONTRACT_TYPES.GOLD_PLAYER :
          constants.metrics.CONTRACT_TYPES.GOLD_COACH,
      ),
      constants.metrics.LIST_CONTRACTS,
      metrics.Count(1),
    );
    this.logger.info('ListContracts successfully', listResult);
  }

  private async sendPurchasedContractsToClub(account: applet.FifaFut18Account) {
    this.logger.info('SendPurchasedContractsToClub', { account: account.name });
    const items = await account.getItems();

    const goldPlayers = _.filter(items.itemData, (item) => {
      return item.resourceId === GOLD_PLAYER_CONTRACT_RESOURCE_ID;
    });
    const goldCoaches = _.filter(items.itemData, (item) => {
      return item.resourceId === GOLD_COACH_CONTRACT_RESOURCE_ID;
    });

    const targets = _
      .chain(items.itemData)
      .filter((item) => {
        return (
          item.resourceId === GOLD_PLAYER_CONTRACT_RESOURCE_ID
          || item.resourceId === GOLD_COACH_CONTRACT_RESOURCE_ID
        );
      })
      .map((item) => item.id)
      .value();

    this.logger.info('Items results', {
      goldPlayers: goldPlayers.length,
      goldCoaches: goldCoaches.length,
    });

    if (targets.length) {
      this.logger.info(
        'Send gold play contracts to my club', { num: targets.length },
      );
      const resp = await account.sendToMyClub(targets);
      const numSuccess = _.filter(resp.itemData, (d) => d.success).length;
      if (numSuccess !== targets.length) {
        this.logger.error('Some items failed',
          { numSuccess, target: targets.length, resp },
        );
      } else {
        this.logger.info('Send gold play contracts to my club successfully',
          { num: targets.length },
        );

        if (goldPlayers.length) {
          await this.emitMetrics(
            account,
            metrics.dimensions(
              constants.metrics.dimensions.CONTRACT_TYPE,
              constants.metrics.CONTRACT_TYPES.GOLD_PLAYER
            ),
            constants.metrics.PURCHASED,
            metrics.Count(goldPlayers.length),
          );
        }

        if (goldCoaches.length) {
          await this.emitMetrics(
            account,
            metrics.dimensions(
              constants.metrics.dimensions.CONTRACT_TYPE,
              constants.metrics.CONTRACT_TYPES.GOLD_COACH,
            ),
            constants.metrics.PURCHASED,
            metrics.Count(goldCoaches.length),
          );
        }
      }
    }
    this.logger.info('SendPurchasedContractsToClub finished successfully');
  }

  private async tradeGoldContract(
    account: applet.FifaFut18Account, page: number = 0,
  ) {
    this.logger.info('TradeGoldContract', { account: account.name, page, });

    const searchResult = await account.searchMarket({
      start:  page * 50,
      num:    50,
      type:   'development',
      cat:    'contract',
      lev:    'gold',
      maxb:   200,
    });

    const total = searchResult.auctionInfo.length;

    const auctions = _.filter(searchResult.auctionInfo, (auctionInfo) => {
      return this.isGoldContract(auctionInfo.itemData);
    });

    this.logger.info('Found items', { total, target: auctions.length });

    await this.emitMetrics(
      account, {}, constants.metrics.CONTRACT_SEARCHED,
      metrics.Count(total),
    );
    await this.emitMetrics(
      account, {}, constants.metrics.CONTRACT_FOUND,
      metrics.Count(auctions.length),
    );

    try {
      for (const item of auctions) {
        this.logger.info('Bid item',
          _.pick(item, 'tradeId', 'resourceId', 'discardValue', 'rareflag'),
        );
        const credits = this.accountInfos[account.name].credits;
        if (credits < 200) {
          this.logger.warn(
            'Not enough budget', { account: account.name, credits },
          );
          await this.updateBidMetrics(account, 'No Budget');
          continue;
        }
        const resp = await account.bid(item.tradeId, 200);
        await this.updateBidMetrics(account, 'Success');
        this.logger.info('Bid item successfully');
      }
    } catch (e) {
      this.logger.error('Bid item error', e && e.message);
      await this.updateBidMetrics(account, 'Error');
    }
    this.logger.info('TradeGoldContract successfully');
  }

  private async updateBidMetrics(
    account: applet.FifaFut18Account, bidStatus: string,
  ) {
    const dimensions: any = {};
    dimensions[constants.metrics.dimensions.ACCOUNT] = account.name;
    dimensions[constants.metrics.dimensions.BID_STATUS] = bidStatus;
    await this.execution.updateMetrics({
      dimensions,
      name: constants.metrics.BID,
      value: metrics.Count(1),
    });
  }

  private isGoldContract(item: applet.fifa.fut18.ItemData): boolean {
    return (
      item.resourceId === GOLD_COACH_CONTRACT_RESOURCE_ID
      || item.resourceId === GOLD_PLAYER_CONTRACT_RESOURCE_ID
    ) && item.rareflag === 1 && item.discardValue >= 63;
  }
}

@applet.Module({
  workers: [
    FutAutoTrader,
  ],
  providers: [
    applet.FifaFut18Account,
  ],
})
class Fut18AutoTraderModule {
}

applet.bootstrap(Fut18AutoTraderModule);
