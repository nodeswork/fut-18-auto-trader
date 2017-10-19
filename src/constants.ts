export namespace metrics {

  export const CONTRACT_TYPES = {
    GOLD_PLAYER: 'Gold Player',
    GOLD_COACH:  'Gold Coach',
  };

  export namespace dimensions {
    export const API_OPERATOR             = 'operator';
    export const ACCOUNT_NAME             = 'account';
    export const CONTRACT_TYPE            = 'contract_type';

    export const ACCOUNT                  = 'Account';

    export const ACCOUNT_STATUS           = 'Account Status';
    export const BID_STATUS               = 'Bid Status';
    export const LISTING_STATUS           = 'Listing Status';
    export const TRADE_STATE              = 'Trade State';
  }

  export const API_STATUS                 = 'api_status';
  export const HEALTHY_ACCOUNT            = 'healthy_account';

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

  export const RELIST                     = 'relist';

  export const CONTRACTS_SEARCH_B150      = 'contracts_search_b150';
  export const CONTRACTS_SEARCH_BN200     = 'contracts_search_b200';

  export const CONTRACTS_BID_B150         = 'contracts_bid_b150';

  export const TRADE_REQUEST       = 'Trade Request';
  export const ACCOUNTS            = 'Accounts';
  export const LISTING_ITEMS       = 'Listing Items';
  export const LIST_CONTRACTS      = 'List Contracts';

  export const CONTRACT_SEARCHED   = 'Contract Searched';
  export const CONTRACT_FOUND      = 'Contract Found';

  export const BID                 = 'Bid';
}
