import * as _                     from 'underscore';;

import * as applet                from '@nodeswork/applet';
import { metrics }                from '@nodeswork/utils';

import * as constants             from './constants';

export type AuctionInfo = applet.fifa.fut18.AuctionInfo;
export type ItemData    = applet.fifa.fut18.ItemData;

const RESOURCES    = constants.resources;
const METRICS      = constants.metrics;
const DIMENSIONS   = constants.metrics.dimensions;
const TRADE_STATE  = constants.trade.state;
const BID_STATE    = constants.bid.state;

export function getContractType(data: AuctionOrItem): string {
  const item = getItemData(data);
  switch (item.resourceId) {
    case RESOURCES.GOLD_PLAYER_CONTRACT_RESOURCE_ID:
    case RESOURCES.GOLD_PLAYER_CONTRACT99_RESOURCE_ID:
      return METRICS.CONTRACT_TYPES.GOLD_PLAYER;
    case RESOURCES.GOLD_COACH_CONTRACT_RESOURCE_ID:
      return METRICS.CONTRACT_TYPES.GOLD_COACH;
    default:
      return METRICS.CONTRACT_TYPES.UNKNOWN;
  }
}

export function isAuctionInfo(data: AuctionOrItem): data is AuctionInfo {
  return (<applet.fifa.fut18.AuctionInfo>data).itemData != null;
}

export function getItemData(data: AuctionOrItem): ItemData {
  return isAuctionInfo(data) ? data.itemData : data;
}

export function isGoldContract(data: AuctionOrItem): boolean {
  return isGoldPlayerContract(data) || isGoldCoachContract(data);
}

export function isGoldPlayerContract(data: AuctionOrItem): boolean {
  const itemData = getItemData(data);
  return itemData.resourceId === RESOURCES.GOLD_PLAYER_CONTRACT_RESOURCE_ID ||
    itemData.resourceId === RESOURCES.GOLD_PLAYER_CONTRACT99_RESOURCE_ID;
}

export function isGoldCoachContract(data: AuctionOrItem): boolean {
  return getItemData(data).resourceId ===
    RESOURCES.GOLD_COACH_CONTRACT_RESOURCE_ID;
}

export function filterGoldContracts(data: AuctionInfo[]): AuctionInfo[];
export function filterGoldContracts(data: ItemData[]): ItemData[];
export function filterGoldContracts(
  data: AuctionOrItem[],
): AuctionOrItem[] {
  return _.filter(data, (x) => isGoldContract(x));
}


export function filterGoldPlayerContracts(data: AuctionInfo[]): AuctionInfo[];
export function filterGoldPlayerContracts(data: ItemData[]): ItemData[];
export function filterGoldPlayerContracts(
  data: AuctionOrItem[],
): AuctionOrItem[] {
  return _.filter(data, (x) => isGoldPlayerContract(x));
}

export function filterGoldCoachContracts(data: AuctionInfo[]): AuctionInfo[];
export function filterGoldCoachContracts(data: ItemData[]): ItemData[];
export function filterGoldCoachContracts(
  data: AuctionOrItem[],
): AuctionOrItem[] {
  return _.filter(data, (x) => isGoldCoachContract(x));
}

export function filterActiveTrades(data: AuctionInfo[]): AuctionInfo[] {
  return _.filter(data, (x) => x.tradeState === TRADE_STATE.ACTIVE);
}

export function filterExpiredTrades(data: AuctionInfo[]): AuctionInfo[] {
  return _.filter(data, (x) => x.tradeState === TRADE_STATE.EXPIRED);
}

export function filterClosedTrades(data: AuctionInfo[]): AuctionInfo[] {
  return _.filter(data, (x) => x.tradeState === TRADE_STATE.CLOSED);
}

export function filterWinningTrades(data: AuctionInfo[]): AuctionInfo[] {
  return _.filter(data, (x) => (
    x.tradeState === TRADE_STATE.ACTIVE && x.bidState === BID_STATE.HIGHEST
  ));
}

export function filterLosingTrades(data: AuctionInfo[]): AuctionInfo[] {
  return _.filter(data, (x) => (
    x.tradeState === TRADE_STATE.ACTIVE && x.bidState === BID_STATE.OUTBID
  ));
}

export function filterWonTrades(data: AuctionInfo[]): AuctionInfo[] {
  return _.filter(data, (x) => (
    x.tradeState === TRADE_STATE.CLOSED && x.bidState === BID_STATE.HIGHEST
  ));
}

export function filterLostTrades(data: AuctionInfo[]): AuctionInfo[] {
  return _.filter(data, (x) => (
    x.tradeState === TRADE_STATE.CLOSED && x.bidState === BID_STATE.OUTBID
  ));
}

export function filterOutbidTrades(data: AuctionInfo[]): AuctionInfo[] {
  return _.filter(data, (x) => x.bidState === BID_STATE.OUTBID);
}

export function getTradeIds(data: AuctionInfo[]): number[] {
  return _.map(data, (x) => x.tradeId);
}

export function getItemIds(data: AuctionOrItem[]): number[] {
  return _.map(data, (x) => isAuctionInfo(x) ? x.itemData.id : x.id);
}

export type AuctionOrItem = AuctionInfo | ItemData;
