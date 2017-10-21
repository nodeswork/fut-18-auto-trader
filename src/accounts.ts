import * as _                      from 'underscore';;

import * as applet                 from '@nodeswork/applet';
import { metrics, NodesworkError } from '@nodeswork/utils';

import * as constants              from './constants';
import * as utils                  from './utils';

const sleep = require('sleep-promise');

const RESOURCES  = constants.resources;
const METRICS    = constants.metrics;
const DIMENSIONS = constants.metrics.dimensions;

const CONTRACT_PRICE = 200;

export interface FifaFut18AccountInfo {
  healthy:           boolean;
  unhealthyReason:   string;
  credits:           number;
  listingSize:       number;
  listedItems:       number;
  transferListSize:  number;

  closedPlayers:     number;
  closedCoaches:     number;
  expiredPlayers:    number;
  expiredCoaches:    number;
  activePlayers:     number;
  activeCoaches:     number;

  playersInClub:     number;
  coachesInClub:     number;
}

export class FifaFut18Account {

  public name:        string;
  public accountInfo: FifaFut18AccountInfo;

  constructor(
    public account: applet.FifaFut18Account,
    private execution: applet.ExecutionMetrics,
  ) {
    this.name = account.name;
  }

  public async init() {
    try {
      const userMassInfo = await this.account.getUserMassInfo();

      if (userMassInfo.userInfo.feature.trade !== 2) {
        throw new NodesworkError('no_trade_feature');
      }

      const listingSizeEntry = _.find(
        userMassInfo.pileSizeClientData.entries, (x) => x.key === 2,
      );
      const transferListSizeEntry = _.find(
        userMassInfo.pileSizeClientData.entries, (x) => x.key === 4,
      );

      this.accountInfo = {
        healthy:           true,
        unhealthyReason:   '',
        credits:           userMassInfo.userInfo.credits,
        listingSize:       listingSizeEntry.value,
        listedItems:       listingSizeEntry.value,
        transferListSize:  transferListSizeEntry.value,

        closedPlayers:     0,
        closedCoaches:     0,
        expiredPlayers:    0,
        expiredCoaches:    0,
        activePlayers:     0,
        activeCoaches:     0,
        playersInClub:     0,
        coachesInClub:     0,
      };

      await this.emitMetrics({}, constants.metrics.CREDITS,
        metrics.Last(userMassInfo.userInfo.credits),
      );
      await this.emitMetrics({}, constants.metrics.LISTING_SIZE,
        metrics.Average(listingSizeEntry.value),
      );
      await this.emitMetrics({}, constants.metrics.TRANSFER_LIST_SIZE,
        metrics.Average(transferListSizeEntry.value),
      );
    } catch (e) {
      const unhealthyReason: string = e.message || 'unknown';
      this.accountInfo = {
        healthy:           false,
        unhealthyReason,
        credits:           0,
        listingSize:       0,
        listedItems:       0,
        transferListSize:  0,

        closedPlayers:     0,
        closedCoaches:     0,
        expiredPlayers:    0,
        expiredCoaches:    0,
        activePlayers:     0,
        activeCoaches:     0,
        playersInClub:     0,
        coachesInClub:     0,
      };
    }
  }

  public async emitClubMetrics() {
    await this.emitGoldContractsMetrics(
      {}, METRICS.CONTRACTS_SOLD,
      metrics.Count(this.accountInfo.closedPlayers),
      metrics.Count(this.accountInfo.closedCoaches),
    );

    await this.emitGoldContractsMetrics(
      {}, METRICS.CONTRACTS_LISTING, metrics.Last(
        this.accountInfo.activePlayers + this.accountInfo.expiredPlayers,
      ), metrics.Last(
        this.accountInfo.activeCoaches + this.accountInfo.expiredCoaches,
      ),
    );

    await this.emitGoldContractsMetrics(
      {}, METRICS.ACTIVE_CONTRACTS_AVERAGE,
      metrics.Average(this.accountInfo.activePlayers),
      metrics.Average(this.accountInfo.activeCoaches),
    );
    await this.emitGoldContractsMetrics(
      {}, METRICS.EXPIRED_CONTRACTS_AVERAGE,
      metrics.Average(this.accountInfo.expiredPlayers),
      metrics.Average(this.accountInfo.expiredCoaches),
    );
    await this.emitGoldContractsMetrics(
      {}, METRICS.SOLD_CONTRACTS_AVERAGE,
      metrics.Average(this.accountInfo.closedPlayers),
      metrics.Average(this.accountInfo.closedCoaches),
    );

    await this.emitGoldContractsMetrics(
      {}, METRICS.CONTRACTS_IN_CLUB,
      metrics.Last(this.accountInfo.playersInClub),
      metrics.Last(this.accountInfo.coachesInClub),
    );

    await this.emitMetrics(
      {}, METRICS.CLUB_VALUE,
      metrics.Last(
        this.accountInfo.credits + CONTRACT_PRICE * (
          this.accountInfo.activeCoaches + this.accountInfo.activePlayers +
          this.accountInfo.expiredCoaches + this.accountInfo.expiredPlayers +
          this.accountInfo.coachesInClub + this.accountInfo.playersInClub
        ),
      ),
    );
  }

  public async getItems(): Promise<applet.fifa.fut18.ItemResponse> {
    return this.account.getItems();
  }

  public async searchMarket(
    options: applet.fifa.fut18.SearchMarketOptions,
  ): Promise<applet.fifa.fut18.SearchResult> {
    return this.account.searchMarket(options);
  }

  public async sendToMyClub(
    itemIds: number[],
  ): Promise<applet.fifa.fut18.SendItemResponse> {
    return this.account.sendToMyClub(itemIds);
  }

  public async getWatchList(): Promise<applet.fifa.fut18.WatchListResponse> {
    return this.account.getWatchList();
  }

  public async getTradePile(): Promise<applet.fifa.fut18.TradePile> {
    return this.account.getTradePile();
  }

  public async getClubDevelopmentConsumables(
  ): Promise<applet.fifa.fut18.ClubDevelopmentConsumablesResponse> {
    return this.account.getClubDevelopmentConsumables();
  }

  public async deleteWatchlist(tradeIds: number[]): Promise<void> {
    return this.account.deleteWatchlist(tradeIds);
  }

  public async deleteSold(): Promise<void> {
    return this.account.deleteSold();
  }

  public async relist(): Promise<applet.fifa.fut18.RelistResponse> {
    await this.emitMetrics({}, constants.metrics.RELIST, metrics.Count(1));
    return this.account.relist();
  }

  public async list(
    options: applet.fifa.fut18.ListOptions,
  ): Promise<applet.fifa.fut18.ListResponse> {
    return this.account.list(options);
  }

  public async sendResourceToTransferList(
    resourceIds: number[],
  ): Promise<applet.fifa.fut18.SendItemResponse> {
    return this.account.sendResourceToTransferList(resourceIds);
  }

  public async emitGoldContractsMetrics<T>(
    dimensions:       metrics.MetricsDimensions,
    name:             string,
    goldPlayerValue:  metrics.MetricsValue<T>,
    goldCoachValue:   metrics.MetricsValue<T>,
  ) {
    const d = _.clone(dimensions || {});

    d[DIMENSIONS.CONTRACT_TYPE] = METRICS.CONTRACT_TYPES.GOLD_PLAYER;
    await this.emitMetrics(d, name, goldPlayerValue);

    d[DIMENSIONS.CONTRACT_TYPE] = METRICS.CONTRACT_TYPES.GOLD_COACH;
    await this.emitMetrics(d, name, goldCoachValue);
  }

  public async emitMetrics<T>(
    dimensions:  metrics.MetricsDimensions,
    name:        string,
    value:       metrics.MetricsValue<T>,
  ) {
    const d = metrics.dimensions(
      DIMENSIONS.ACCOUNT_NAME, this.account.name,
    );
    await this.execution.updateMetrics({
      dimensions: _.extend(d, dimensions), name, value,
    });
  }

  public async bid(
    auction: applet.fifa.fut18.AuctionInfo,
    bidOptions: { purpose: string; price: number; },
  ): Promise<applet.fifa.fut18.BidResponse> {
    const contractType = utils.getContractType(auction);
    let   bidStatus    = 200;
    try {
      return await this.account.bid(auction.tradeId, bidOptions.price);
    } catch (e) {
      bidStatus = e.meta && e.meta.responseCode || 0;
      throw e;
    } finally {
      await this.emitMetrics(
        metrics.dimensions(
          DIMENSIONS.CONTRACT_TYPE, contractType,
          DIMENSIONS.BID_PRICE,     bidOptions.price,
          DIMENSIONS.BID_STATUS,    bidStatus,
          DIMENSIONS.BID_PURPOSE,   bidOptions.purpose,
        ),
        METRICS.BID,
        metrics.Average(bidStatus === 200 ? 1 : 0),
      );
      await sleep(1000);
    }
  }
}
