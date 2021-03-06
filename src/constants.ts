export namespace resources {
  export const GOLD_PLAYER_CONTRACT_RESOURCE_ID        = 5001006;
  export const GOLD_PLAYER_CONTRACT99_RESOURCE_ID        = 5001007;
  export const GOLD_COACH_CONTRACT_RESOURCE_ID         = 5001013;
}

export namespace trade.state {
  export const ACTIVE   = 'active';
  export const EXPIRED  = 'expired';
  export const CLOSED   = 'closed';
}

export namespace bid.state {
  export const HIGHEST = 'highest';
  export const OUTBID  = 'outbid';
}

export namespace metrics {

  export const CONTRACT_TYPES = {
    GOLD_PLAYER: 'Gold Player',
    GOLD_COACH:  'Gold Coach',
    UNKNOWN:     'Unknown',
  };

  export namespace dimensions {
    export const API_OPERATOR             = 'operator';
    export const ACCOUNT_NAME             = 'account';
    export const CONTRACT_TYPE            = 'contract_type';
    export const BID_PRICE                = 'bid_price';
    export const BID_STATUS               = 'bid_status';
    export const BID_PURPOSE              = 'bid_purpose';
    export const UNHEALTY_REASON          = 'reason';
    export const API_RESPONSE_CODE        = 'code';

    export const ACCOUNT                  = 'Account';

    export const ACCOUNT_STATUS           = 'Account Status';
    export const LISTING_STATUS           = 'Listing Status';
    export const TRADE_STATE              = 'Trade State';
  }

  export const API_STATUS                 = 'api_status';
  export const HEALTHY_ACCOUNT            = 'healthy_account';
  export const ACCOUNT_HEALTHY_RATE       = 'account_healthy_rate';
  export const TRADE_REQUEST              = 'trade_request';

  export const CREDITS                    = 'credits';
  export const LISTING_SIZE               = 'listing_size';
  export const TRANSFER_LIST_SIZE         = 'transfer_list_size';
  export const CONTRACTS_IN_CLUB          = 'contracts_in_club';
  export const CONTRACTS_LISTING          = 'contracts_listing';
  export const CLUB_VALUE                 = 'club_value';

  export const CONTRACTS_SOLD             = 'contracts_sold';
  export const CONTRACTS_PURCHASED        = 'contracts_purchased';
  export const CONTRACTS_RELISTED         = 'contracts_relisted';
  export const CONTRACTS_OUTBID           = 'contracts_outbid';
  export const ACTIVE_CONTRACTS_AVERAGE   = 'active_contracts_average';
  export const EXPIRED_CONTRACTS_AVERAGE  = 'expired_contracts_average';
  export const SOLD_CONTRACTS_AVERAGE     = 'sold_contracts_average';

  export const BID                        = 'bid';
  export const LIST                       = 'list';
  export const RELIST                     = 'relist';

  export const CONTRACTS_SEARCH_B150      = 'contracts_search_b150';
  export const CONTRACTS_SEARCH_BN200     = 'contracts_search_b200';

  export const CONTRACTS_BID_B150         = 'contracts_bid_b150';

  // export const ACCOUNTS            = 'Accounts';
  // export const LISTING_ITEMS       = 'Listing Items';

  // export const CONTRACT_SEARCHED   = 'Contract Searched';
  // export const CONTRACT_FOUND      = 'Contract Found';

}
