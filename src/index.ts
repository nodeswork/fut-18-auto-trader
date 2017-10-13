import * as _      from 'underscore';;

import * as kiws   from '@nodeswork/kiws';
import * as applet from '@nodeswork/applet';
import { metrics } from '@nodeswork/utils';

import * as errors from './errors';

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
  @kiws.Inject() logger:            applet.ContextLogger;
  @kiws.Inject() execution:         applet.ExecutionMetrics;

  private userMassInfo:  applet.fifa.fut18.UserMassInfo;
  private credits:       number;

  @applet.Worker({
    name:      'Trade',
    schedule:  '0 * * * * *',
    default:   true,
  })
  async trade() {
    this.logger.info('Trade starts');
    if (this.fifaFut18Account == null) {
      throw errors.FIFA_ACCOUNT_IS_MISSING_ERROR;
    }
    await this.fetchUserInfo();
    this.logger.info(
      'Fetch the user info successfully', { credits: this.credits },
    );

    await this.sendPurchasedContractsToClub();
    await this.removeOrRelistSellings();
    await this.listContracts();
    await this.tradeGoldContract();
    this.logger.info('Trade ends successfully');
  }

  private async fetchUserInfo() {
    this.userMassInfo  = await this.fifaFut18Account.getUserMassInfo();
    this.credits       = this.userMassInfo.userInfo.credits;
  }

  private async removeOrRelistSellings() {
    this.logger.info('RemoveOrRelistSellings');

    const tradePile = await this.fifaFut18Account.getTradePile();

    const contracts = _.filter(tradePile.auctionInfo, (auction) => {
      return this.isGoldContract(auction.itemData);
    });

    const groupedContractsByTradeState = _.groupBy(contracts, (auction) => {
      return auction.tradeState;
    });

    const info = _.mapObject(
      groupedContractsByTradeState, (vals) => vals.length,
    );
    this.logger.info('Trading Status', info);

    const expiredContracts = groupedContractsByTradeState[TRADE_STATES.EXPIRED];
    const soldContracts = groupedContractsByTradeState[TRADE_STATES.CLOSED];

    if (soldContracts && soldContracts.length > 0) {
      this.logger.info('Remove sold contracts');
      await this.fifaFut18Account.deleteSold();
    }

    if (expiredContracts && expiredContracts.length >= 10) {
      this.logger.info('Relisting expired contracts');
      const resp = await this.fifaFut18Account.relist();
      this.logger.info('Relisting result', resp);
    }

    this.logger.info('RemoveOrRelistSellings finished');
  }

  private async listContracts() {
    this.logger.info('ListContracts');

    const dc = await this.fifaFut18Account.getClubDevelopmentConsumables();
    const goldPlayerContract = _.find(
      dc.itemData,
      (d) => (
        d.resourceId === GOLD_PLAYER_CONTRACT_RESOURCE_ID
        || d.resourceId === GOLD_COACH_CONTRACT_RESOURCE_ID
      ),
    );

    if (goldPlayerContract == null || goldPlayerContract.count <= 0) {
      this.logger.info('No gold player contract in club');
      return;
    }

    const resp = await this.fifaFut18Account.sendResourceToTransferList(
      [ goldPlayerContract.resourceId ],
    );
    const itemId = resp.itemData[0].id;

    if (!resp.itemData[0].success) {
      this.logger.error(
        'Send gold player contract to transfer list failed', goldPlayerContract,
      );
      return;
    }

    const listResult = await this.fifaFut18Account.list({
      itemId,
      buyNowPrice:  300,
      startingBid:  250,
      duration:     3600,
    });

    this.logger.info('ListContracts successfully', listResult);
  }

  private async sendPurchasedContractsToClub() {
    this.logger.info('SendPurchasedContractsToClub');
    const items = await this.fifaFut18Account.getItems();

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
      total:                items.itemData.length,
      playerContractCount:  targets.length,
    });

    if (targets.length) {
      this.logger.info(
        'Send gold play contracts to my club', { num: targets.length },
      );
      const resp = await this.fifaFut18Account.sendToMyClub(targets);
      const numSuccess = _.filter(resp.itemData, (d) => d.success).length;
      if (numSuccess !== targets.length) {
        this.logger.error('Some items failed',
          { numSuccess, target: targets.length, resp },
        );
      } else {
        this.logger.info('Send gold play contracts to my club successfully',
          { num: targets.length },
        );
      }
    }
    this.logger.info('SendPurchasedContractsToClub finished successfully');
  }

  private async tradeGoldContract() {
    this.logger.info('TradeGoldContract');
    const searchResult = await this.fifaFut18Account.searchMarket({
      start:  0,
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

    await this.execution.updateMetrics({
      dimensions:  { },
      name:        'Contract Searched',
      value:       metrics.Count(total),
    });

    await this.execution.updateMetrics({
      dimensions:  { },
      name:        'Contract Found',
      value:       metrics.Count(auctions.length),
    });

    try {
      for (const item of auctions) {
        this.logger.info('Bid item',
          _.pick(item, 'tradeId', 'resourceId', 'discardValue', 'rareflag'),
        );
        if (this.credits < 200) {
          this.logger.warn('Not enough budget', { credits: this.credits });
          continue;
        }
        const resp = await this.fifaFut18Account.bid(item.tradeId, 200);
        this.logger.info('Bid item successfully');
      }
    } catch (e) {
      this.logger.error('Bid item error', e && e.message);
    }
    this.logger.info('TradeGoldContract successfully');
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
