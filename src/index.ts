import * as _                     from 'underscore';;

import * as kiws                  from '@nodeswork/kiws';
import * as applet                from '@nodeswork/applet';
import { metrics }                from '@nodeswork/utils';

import * as def                   from './def';
import * as errors                from './errors';
import * as constants             from './constants';
import { AccountActivityTracker } from './tracker';
import { FifaFut18Account }       from './accounts';
import * as utils                 from './utils';

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

const CONTRACT_PRICE = 200;

const METRICS    = constants.metrics;
const DIMENSIONS = constants.metrics.dimensions;

@applet.WorkerProvider({})
class FutAutoTrader {

  @kiws.Input({ type: 'FifaFut18Account' })
  originalAccounts: applet.FifaFut18Account[];

  accounts:  FifaFut18Account[] = [];

  @kiws.Inject() logger:            applet.ContextLogger;
  @kiws.Inject() execution:         applet.ExecutionMetrics;

  private async intializeAccountInfo() {
    const total = this.originalAccounts.length;

    for (const originalAccount of this.originalAccounts) {
      originalAccount.setTracker(new AccountActivityTracker(this.execution,
        metrics.dimensions(DIMENSIONS.ACCOUNT_NAME, originalAccount.name),
      ));

      const account = new FifaFut18Account(
        originalAccount, this.execution, this.logger,
      );
      await account.init();
      if (account.accountInfo.healthy) {
        this.accounts.push(account);
      }
      await account.emitMetrics(
        metrics.dimensions(
          DIMENSIONS.UNHEALTY_REASON, account.accountInfo.unhealthyReason
        ),
        METRICS.HEALTHY_ACCOUNT, metrics.Average(
        account.accountInfo.healthy ? total : 0, 1 / total,
      ));
    }
  }

  @applet.Worker({
    name:      'Trade',
    schedule:  '0 0 * * * *',
    default:   true,
  })
  async trade() {
    this.logger.info('Trade starts');
    await this.execution.updateMetrics({
      name:   METRICS.TRADE_REQUEST,
      value:  metrics.Count(1),
    });

    await this.intializeAccountInfo();

    // for (const account of this.accounts) {
      // await this.sendPurchasedContractsToClub(account);
      // await this.removeOrRelistSellings(account);
      // await this.listContracts(account, {
        // count:        2,
        // startingBid:  250,
        // buyNowPrice:  300,
      // });

      // await account.emitClubMetrics();
    // }

    // for (let idx = 0; idx < 4; idx++) {
      // this.logger.info('Search page', { page: idx });
      // const account = this.accounts[idx % this.accounts.length];
      // try {
        // if (account.accountInfo.credits > 5000) {
          // await this.tradeB200(account, idx);
        // } else {
          // await this.tradeB150(account, idx);
        // }
      // } catch (e) {
        // this.logger.error('Trade error');
      // }
    // }

    this.logger.info('Trade ends successfully');
  }

  private async sendPurchasedContractsToClub(account: FifaFut18Account) {
    this.logger.info('SendPurchasedContractsToClub', { account: account.name });

    // Step 1 - Check purchased items.
    const items = await account.getItems();

    const contracts   = utils.filterGoldContracts(items.itemData);
    const playerItems = utils.filterGoldPlayerContracts(contracts);
    const coachItems  = utils.filterGoldCoachContracts(contracts);
    const itemIds     = utils.getItemIds(contracts);

    this.logger.info('Items results', {
      goldPlayers: playerItems.length,
      goldCoaches: coachItems.length,
    });

    if (itemIds.length) {
      this.logger.info('Send gold play contracts to my club',
        { num: itemIds.length },
      );
      await account.sendToMyClub(itemIds);
      this.logger.info('Send gold play contracts to my club successfully');

      await account.emitGoldContractsMetrics(
        {}, METRICS.CONTRACTS_PURCHASED,
        metrics.Count(playerItems.length),
        metrics.Count(coachItems.length),
      );
    }

    // Step 2 - Check won items.

    const watchList = await account.getWatchList();
    const wonItems  = utils.filterWonTrades(watchList.auctionInfo);
    const purchased = utils.filterGoldContracts(wonItems);

    if (purchased.length) {
      await account.sendToMyClub(utils.getItemIds(purchased));

      const wonPlayers = utils.filterGoldPlayerContracts(purchased);
      const wonCoaches = utils.filterGoldCoachContracts(purchased);

      await account.emitGoldContractsMetrics(
        {}, constants.metrics.CONTRACTS_PURCHASED,
        metrics.Count(wonPlayers.length), metrics.Count(wonCoaches.length),
      );
    }

    const outbids = utils.filterOutbidTrades(watchList.auctionInfo);

    if (outbids.length) {

      await account.deleteWatchlist(utils.getTradeIds(outbids));

      const outbidPlayers = utils.filterGoldPlayerContracts(outbids);
      const outbidCoaches = utils.filterGoldCoachContracts(outbids);

      await account.emitGoldContractsMetrics(
        {}, constants.metrics.CONTRACTS_OUTBID,
        metrics.Count(outbidPlayers.length),
        metrics.Count(outbidCoaches.length),
      );
    }

    this.logger.info('SendPurchasedContractsToClub finished successfully');
  }

  private async removeOrRelistSellings(account: FifaFut18Account) {
    this.logger.info('RemoveOrRelistSellings', { account: account.name });

    const tradePile = await account.getTradePile();
    const contracts = utils.filterGoldContracts(tradePile.auctionInfo);
    const closed    = utils.filterClosedTrades(contracts);
    const expired   = utils.filterExpiredTrades(contracts);
    const active    = utils.filterActiveTrades(contracts);
    const notListed = _.filter(contracts, (x) => x.tradeId === 0);

    const info          = account.accountInfo;
    info.closedPlayers  = utils.filterGoldPlayerContracts(closed).length;
    info.closedCoaches  = utils.filterGoldCoachContracts(closed).length;
    info.expiredPlayers = utils.filterGoldPlayerContracts(expired).length;
    info.expiredCoaches = utils.filterGoldCoachContracts(expired).length;
    info.activePlayers  = utils.filterGoldPlayerContracts(active).length;
    info.activeCoaches  = utils.filterGoldCoachContracts(active).length;

    account.accountInfo.listedItems = (
      tradePile.auctionInfo == null ? 0 : tradePile.auctionInfo.length
    );

    // Step 1 - Remove closed contracts
    if (closed.length) {
      this.logger.info('Remove sold contracts');
      await account.deleteSold();
      account.accountInfo.listedItems -= expired.length;
    }

    // Step 2 - Relist if 10 <= expired contracts <= 20
    let releasedFailed = false;
    if (expired.length >= 10 && expired.length <= 20) {
      this.logger.info('Relisting expired contracts', { num: expired.length });
      try {
        await account.relist();

        await account.emitGoldContractsMetrics(
          {}, METRICS.CONTRACTS_RELISTED,
          metrics.Count(info.expiredPlayers), metrics.Count(info.expiredCoaches),
        );
      } catch (e) {
        this.logger.info('Relisting expired contracts failed');
        releasedFailed = true;
      }
    }

    // Step 3 - Send back to club if expired contracts > 20
    if (expired.length > 20 || releasedFailed) {
      this.logger.info('Send back expired contracts', { num: expired.length });
      await account.sendToMyClub(utils.getItemIds(expired));
      info.expiredPlayers = 0;
      info.expiredCoaches = 0;
    }

    if (notListed.length > 3) {
      this.logger.info('Send back not listed contracts',
        { num: notListed.length },
      );
      await account.sendToMyClub(utils.getItemIds(notListed));
    }

    this.logger.info('RemoveOrRelistSellings finished');
  }

  private async listContracts(account: FifaFut18Account, options: {
    count:        number;
    startingBid:  number;
    buyNowPrice:  number;
  }) {
    this.logger.info('ListContracts', { account: account.name });

    const dc = await account.getClubDevelopmentConsumables();

    const players = _.find(
      dc.itemData, (d) => d.resourceId === GOLD_PLAYER_CONTRACT_RESOURCE_ID
    );
    const coaches = _.find(
      dc.itemData, (d) => d.resourceId === GOLD_COACH_CONTRACT_RESOURCE_ID
    );

    account.accountInfo.playersInClub = players == null ? 0 : players.count;
    account.accountInfo.coachesInClub = coaches == null ? 0 : coaches.count;

    const target = coaches || players;

    if (target == null || target.count <= 0) {
      this.logger.info('No gold player contract in club');
      return;
    }

    // if (account.name === 'zyz.4.zy.z@gmail.com') {
      // return;
    // }

    for (let i = Math.min(options.count, target.count) - 1; i >= 0; i--) {
      if (account.accountInfo.listedItems >= account.accountInfo.listingSize) {
        this.logger.warn('No room to list');
        return;
      }

      const res = await account.sendResourceToTransferList([target.resourceId]);
      const itemId = res.itemData[0].id;

      if (!res.itemData[0].success) {
        this.logger.error(
          'Send gold player contract to transfer list failed', target,
        );
        continue;
      }

      let startingBid = 250;
      let buyNowPrice = 300;

      let success = true;

      try {
        await account.list({
          itemId,
          buyNowPrice:  options.buyNowPrice,
          startingBid:  options.startingBid,
          duration:     3600,
        });
        this.logger.info('ListContracts successfully');
      } catch (e) {
        success = false;
        throw e;
      } finally {
        account.emitMetrics(
          metrics.dimensions(
            constants.metrics.dimensions.CONTRACT_TYPE,
            target.resourceId === GOLD_PLAYER_CONTRACT_RESOURCE_ID ?
            constants.metrics.CONTRACT_TYPES.GOLD_PLAYER :
            constants.metrics.CONTRACT_TYPES.GOLD_COACH,
          ),
          METRICS.LIST, metrics.Average(success ? 1 : 0),
        );
      }

      account.accountInfo.listedItems += 1;
    }
  }

  private async tradeB150(
    account: FifaFut18Account, page: number = 0,
  ) {
    const searchResult = await account.searchMarket({
      start:  page * 50,
      num:    50,
      type:   'development',
      cat:    'contract',
      lev:    'gold',
      macr:   150,
    });
    const total    = searchResult.auctionInfo.length;
    const auctions = utils.filterGoldContracts(searchResult.auctionInfo);
    const biddable = _.filter(auctions, (auctionInfo) => {
      return auctionInfo.currentBid <= 100;
    });

    await account.emitMetrics(
      {}, METRICS.CONTRACTS_SEARCH_B150,
      metrics.Average(biddable.length / total, total),
    );

    for (const item of biddable) {
      if (account.accountInfo.credits < 150) {
        this.logger.warn('Not enough budget', {
          account: account.name, credits: account.accountInfo.credits,
        });
        continue;
      }

      await account.bid(item, { purpose: 'B150', price: 150 });
      account.accountInfo.credits -= 150;
    }
  }

  private async tradeB200(
    account: FifaFut18Account, page: number = 0,
  ) {
    this.logger.info('TradeB200', { account: account.name, page, });

    const searchResult = await account.searchMarket({
      start:  page * 50,
      num:    50,
      type:   'development',
      cat:    'contract',
      lev:    'gold',
      maxb:   200,
    });

    const total = searchResult.auctionInfo.length;

    const auctions = utils.filterGoldContracts(searchResult.auctionInfo);
    this.logger.info('Found items', { total, target: auctions.length });

    await account.emitMetrics(
      {}, METRICS.CONTRACTS_SEARCH_BN200,
      metrics.Average(auctions.length / total, total),
    );

    for (const item of auctions) {
      if (account.accountInfo.credits < 200) {
        this.logger.warn('Not enough budget', {
          account: account.name, credits: account.accountInfo.credits,
        });
        continue;
      }
      await account.bid(item, { purpose: 'B200', price: 200 });
      account.accountInfo.credits -= 200;
    }

    this.logger.info('TradeB200 successfully');
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
