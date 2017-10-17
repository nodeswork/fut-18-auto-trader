export namespace metrics {

  export const CONTRACT_TYPES = {
    GOLD_PLAYER: 'Gold Player',
    GOLD_COACH:  'Gold Coach',
  };

  export namespace dimensions {

    export const ACCOUNT           = 'Account';
    export const ACCOUNT_STATUS    = 'Account Status';
    export const CONTRACT_TYPE     = 'Contract Type';
    export const BID_STATUS        = 'Bid Status';
    export const LISTING_STATUS    = 'Listing Status';
    export const TRADE_STATE       = 'Trade State';
  }

  export const TRADE_REQUEST       = 'Trade Request';
  export const ACCOUNTS            = 'Accounts';
  export const CREDITS             = 'Credits';
  export const LISTING_SIZE        = 'Listing Size';
  export const PURCHASED           = 'Purchased';
  export const LISTING_CONTRACTS   = 'Listing Contracts';
  export const LIST_CONTRACTS      = 'List Contracts';
  export const RELIST              = 'Relist';
  export const OWN_CONTRACTS       = 'Own Contracts';

  export const CONTRACT_SEARCHED   = 'Contract Searched';
  export const CONTRACT_FOUND      = 'Contract Found';

  export const BID                 = 'Bid';
}
