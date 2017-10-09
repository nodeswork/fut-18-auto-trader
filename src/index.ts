import * as _      from 'underscore';;
import * as kiws   from '@nodeswork/kiws';
import * as applet from '@nodeswork/applet';
import * as logger from '@nodeswork/logger';

import * as errors from './errors';

const LOG = logger.getLogger();

const GOLD_PLAYER_CONTRACT_RESOURCE_ID = 5001006;
const GOLD_PLAYER_CONTRACT_DUPLICATE_ITEM_ID = 116603334268;

@applet.WorkerProvider({})
class FutAutoTrader {

  @kiws.Input() fifaFut18Account: applet.FifaFut18Account;

  @applet.Worker({
    name:      'Trade',
    schedule:  '0 * * * * *',
    default:   true,
  })
  async trade() {
    if (this.fifaFut18Account == null) {
      throw errors.FIFA_ACCOUNT_IS_MISSING_ERROR;
    }

    const userMassInfo = await this.fifaFut18Account.getUserMassInfo();

    const credits = userMassInfo.userInfo.credits;

    LOG.info('TRADING....', { credits });

    await this.sendContractsInItemsToClub();
    await this.listContracts();
    await this.tradeGoldContract();
  }

  private async listContracts() {
    const dc = await this.fifaFut18Account.getClubDevelopmentConsumables();
    const goldPlayerContract = _.find(
      dc.itemData,
      (d) => d.resourceId === GOLD_PLAYER_CONTRACT_RESOURCE_ID,
    );

    if (goldPlayerContract == null || goldPlayerContract.count <= 0) {
      LOG.info('No gold player contract in club');
      return;
    }

    const resp = await this.fifaFut18Account.sendResourceToTransferList(
      [ goldPlayerContract.resourceId ],
    );
    const itemId = resp.itemData[0].id;

    if (!resp.itemData[0].success) {
      LOG.error(
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

    LOG.info('List item result', listResult);
  }

  private async sendContractsInItemsToClub() {
    const items = await this.fifaFut18Account.getItems();

    const targets = _
      .chain(items.duplicateItemIdList)
      .filter((dupItem) => {
        return dupItem.duplicateItemId ===
          GOLD_PLAYER_CONTRACT_DUPLICATE_ITEM_ID;
      })
      .map((dupItem) => {
        return _.find(items.itemData, (item) => item.id === dupItem.itemId);
      })
      .map((item) => item.id)
      .value();

    if (targets.length) {
      LOG.info('Send gold play contracts to my club',
        { num: targets.length, targets },
      );
      const resp = await this.fifaFut18Account.sendToMyClub(targets);
      const numSuccess = _.filter(resp.itemData, (d) => d.success).length;
      if (numSuccess !== targets.length) {
        LOG.error('Some items failed',
          { numSuccess, target: targets.length, resp },
        );
      }
    }
  }

  private async tradeGoldContract() {
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
      return auctionInfo.itemData.discardValue >= 63
        && auctionInfo.itemData.rareflag === 1
      // && auctionInfo.itemData.resourceId === GOLD_PLAYER_CONTRACT_RESOURCE_ID
      ;
    });

    LOG.info('Found items', { total, target: auctions.length });

    try {
      for (const item of auctions) {
        const resp = await this.fifaFut18Account.bid(item.tradeId, 200);
        LOG.info('Bid item successfully', item);
      }
    } catch (e) {
      LOG.error('Bid item error', e);
    }
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
