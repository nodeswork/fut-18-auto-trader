import * as _         from 'underscore';
import * as applet    from '@nodeswork/applet';
import * as utils     from '@nodeswork/utils';

import * as constants from './constants';

export class AccountActivityTracker implements applet.OperateTracker {

  constructor(
    private execution: applet.ExecutionMetrics,
    private dimensions: utils.metrics.MetricsDimensions,
  ) { }

  async track(options: applet.AccountOperateOptions, err: any, result: any) {
    const dimensions = _.clone(this.dimensions);
    dimensions[constants.metrics.dimensions.API_OPERATOR] = options.name;
    await this.execution.updateMetrics({
      name:        constants.metrics.API_STATUS,
      dimensions,
      value:       utils.metrics.Average(err ? 0 :  1),
    });
  }
}
