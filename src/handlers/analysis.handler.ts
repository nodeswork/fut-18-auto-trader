import * as _             from 'underscore';

import * as kiws          from '@nodeswork/kiws';
import { ui }             from '@nodeswork/applet/dist/ui';
import { NodesworkError } from '@nodeswork/utils';

import * as constants     from '../constants';

const METRICS    = constants.metrics;
const DIMENSIONS = constants.metrics.dimensions;

@kiws.Handler({})
export class AnalysisHandler {

  @kiws.Input() ctx: kiws.ContextInput;

  constructor(
  ) { }

  @kiws.Endpoint({ path: '/analysis' })
  async analysis() {

    const executionMonitoringGroup: ui.metrics.MetricsPanelGroup = {
      title:             'Account Healthy Monitoring',
      dimensionConfigs:  [
        {
          name:          DIMENSIONS.ACCOUNT_NAME,
          filters:       [],
          enabled:       false,
        },
        {
          name:          DIMENSIONS.UNHEALTY_REASON,
          filters:       [],
          enabled:       false,
        },
      ],
      metricsConfigs:    [
        {
          name:          METRICS.HEALTHY_ACCOUNT,
          source:        'executions',
        },
        {
          name:          METRICS.ACCOUNT_HEALTHY_RATE,
          source:        'executions',
        },
      ],
      graphs:            [
        {
          title:         'Account Healthy Checks',
          width:         2,
          chart:         {
            type:        'multiBarChart',
            stack:       true,
          },
          metrics:       [
            {
              name:         METRICS.ACCOUNT_HEALTHY_RATE,
              displayName:  'checks',
              retrieve:     'denominator',
            },
          ],
        },
        {
          title:         'Average Healthy Rate',
          width:         2,
          chart:         {
            type:        'lineChart',
          },
          percentage:    true,
          metrics:       [
            {
              name:         METRICS.ACCOUNT_HEALTHY_RATE,
            },
          ],
        },
      ],
    };

    const apiMonitoringGroup: ui.metrics.MetricsPanelGroup = {
      title:             'Execution Monitoring',
      dimensionConfigs:  [
        {
          name:          'account',
          filters:       [],
          enabled:       false,
        },
        {
          name:          'operator',
          filters:       [],
          enabled:       false,
        },
      ],
      metricsConfigs:    [
        {
          name:          'api_status',
          source:        'executions',
        },
        {
          name:          'healthy_account',
          source:        'executions',
        },
      ],
      graphs:            [
        {
          title:         'Account Healthy',
          width:         2,
          chart:         {
            type:        'lineChart',
          },
          metrics:       [
            {
              name:      'healthy_account',
            },
          ],
        },
        {
          title:         'API Status',
          width:         2,
          chart:         {
            type:        'lineChart',
          },
          percentage:    true,
          metrics:       [
            {
              name:      'api_status',
            },
          ],
        },
        {
          title:         'API Call Counts',
          width:         2,
          chart:         {
            type:        'lineChart',
          },
          metrics:       [
            {
              name:         'api_status',
              displayName:  'success',
              retrieve:     'numerator',
            },
            {
              name:         'api_status',
              displayName:  'total',
              retrieve:     'denominator',
            },
          ],
        },
      ],
    };

    const clubPerformanceGroup: ui.metrics.MetricsPanelGroup = {
      title:             'Club Performance',
      dimensionConfigs:  [
        {
          name:          'account',
          filters:       [],
          enabled:       false,
        },
        {
          name:          'contract_type',
          filters:       [],
          enabled:       false,
        },
      ],
      metricsConfigs:    [
        {
          name:          'credits',
          source:        'executions',
        },
        {
          name:          'contracts_in_club',
          source:        'executions',
        },
        {
          name:          'contracts_listing',
          source:        'executions',
        },
        {
          name:          'club_value',
          source:        'executions',
        },
      ],
      graphs:            [
        {
          title:         'Club Value',
          width:         1,
          chart:         {
            type:        'lineChart',
          },
          metrics:       [
            {
              name:      'club_value',
              transform: 'Sum',
            },
          ],
        },
        {
          title:         'Credits',
          width:         1,
          chart:         {
            type:        'lineChart',
          },
          metrics:       [
            {
              name:      'credits',
              transform: 'Sum',
            },
          ],
        },
        {
          title:         'Contracts In Club',
          width:         1,
          chart:         {
            type:        'lineChart',
          },
          metrics:       [
            {
              name:      'contracts_in_club',
              transform: 'Count',
            },
          ],
        },
        {
          title:         'Contracts Listing',
          width:         1,
          chart:         {
            type:        'lineChart',
          },
          metrics:       [
            {
              name:      'contracts_listing',
              transform: 'Count',
            },
          ],
        },
      ],
    };

    const contractsTradingGroup: ui.metrics.MetricsPanelGroup = {
      title:             'Contracts Trading',
      dimensionConfigs:  [
        {
          name:          'account',
          filters:       [],
          enabled:       false,
        },
        {
          name:          'contract_type',
          filters:       [],
          enabled:       false,
        },
      ],
      metricsConfigs:    [
        {
          name:          'contracts_sold',
          source:        'executions',
        },
        {
          name:          'contracts_purchased',
          source:        'executions',
        },
        {
          name:          'contracts_relisted',
          source:        'executions',
        },
        {
          name:          'active_contracts_average',
          source:        'executions',
        },
        {
          name:          'expired_contracts_average',
          source:        'executions',
        },
      ],
      graphs:            [
        {
          title:         'Contracts Sold',
          width:         1,
          chart:         {
            type:        'lineChart',
          },
          metrics:       [
            {
              name:      'contracts_sold',
            },
          ],
        },
        {
          title:         'Contracts Purchased',
          width:         1,
          chart:         {
            type:        'lineChart',
          },
          metrics:       [
            {
              name:      'contracts_purchased',
            },
          ],
        },
        {
          title:         'Contracts Relisted',
          width:         1,
          chart:         {
            type:        'lineChart',
          },
          metrics:       [
            {
              name:      'contracts_relisted',
            },
          ],
        },
        {
          title:         'Active Contracts Average',
          width:         1,
          chart:         {
            type:        'lineChart',
          },
          metrics:       [
            {
              name:      'active_contracts_average',
            },
          ],
        },
        {
          title:         'Expired Contracts Average',
          width:         1,
          chart:         {
            type:        'lineChart',
          },
          metrics:       [
            {
              name:      'expired_contracts_average',
            },
          ],
        },
      ],
    };

    const contractsSearchGroup: ui.metrics.MetricsPanelGroup = {
      title:             'Contracts Search',
      dimensionConfigs:  [
        {
          name:          'account',
          filters:       [],
          enabled:       false,
        },
      ],
      metricsConfigs:    [
        {
          name:          'contracts_search_b150',
          source:        'executions',
        },
        {
          name:          'contracts_search_b200',
          source:        'executions',
        },
      ],
      graphs:            [
        {
          title:         'Contracts Search Bid <= 150',
          width:         2,
          chart:         {
            type:        'lineChart',
          },
          metrics:       [
            {
              name:         'contracts_search_b150',
              displayName:  'searched',
              retrieve:     'denominator',
            },
            {
              name:         'contracts_search_b150',
              displayName:  'found',
              retrieve:     'numerator',
            },
          ],
        },
        {
          title:         'Contracts Search Max Bid = 200',
          width:         2,
          chart:         {
            type:        'lineChart',
          },
          metrics:       [
            {
              name:         'contracts_search_b200',
              displayName:  'searched',
              retrieve:     'denominator',
            },
            {
              name:         'contracts_search_b200',
              displayName:  'found',
              retrieve:     'numerator',
            },
          ],
        },
      ],
    };

    const contractsBidGroup: ui.metrics.MetricsPanelGroup = {
      title:             'Contracts Bid',
      dimensionConfigs:  [
        {
          name:          'account',
          filters:       [],
          enabled:       false,
        },
        {
          name:          'bid_status',
          filters:       [],
          enabled:       false,
        },
        {
          name:          'bid_purpose',
          filters:       [],
          enabled:       false,
        },
        {
          name:          'bid_price',
          filters:       [],
          enabled:       false,
        },
      ],
      metricsConfigs:    [
        {
          name:          'bid',
          source:        'executions',
        },
      ],
      graphs:            [
        {
          title:         'Contracts Bid Success',
          width:         1,
          chart:         {
            type:        'lineChart',
          },
          metrics:       [
            {
              name:         'bid',
              displayName:  'Bid Success',
              retrieve:     'numerator',
            },
          ],
        },
        {
          title:         'Contracts Bid Total',
          width:         2,
          chart:         {
            type:        'multiBarChart',
          },
          metrics:       [
            {
              name:         'bid',
              displayName:  'Bid',
              retrieve:     'denominator',
            },
          ],
        },
        {
          title:         'Contracts Bid',
          width:         2,
          chart:         {
            type:        'lineChart',
          },
          metrics:       [
            {
              name:         'bid',
              displayName:  'Total Bid',
              retrieve:     'denominator',
            },
            {
              name:         'bid',
              displayName:  'Bid Success',
              retrieve:     'numerator',
            },
          ],
        },
      ],
    };


    return {
      rangeSelection:      {
        granularity:       600, // 3600,
        timerange:         {
          start:           - 4 * 3600 * 1000,
          end:             0,
        },
      },
      groups:              [
        executionMonitoringGroup,
        // clubPerformanceGroup,
        // contractsTradingGroup,
        // contractsSearchGroup,
        // contractsBidGroup,
      ],
    };
  }
}
