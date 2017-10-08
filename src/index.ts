import * as kiws       from '@nodeswork/kiws';
import * as applet     from '@nodeswork/applet';
import * as logger     from '@nodeswork/logger';

const LOG = logger.getLogger();

@applet.WorkerProvider({})
class FutAutoTrader {

  @kiws.Input() fifaFut18Account: applet.FifaFut18Account;

  @applet.Worker({
    name:      'Trade',
    schedule:  '0 * * * * *',
    default:   true,
  })
  async trade() {
    LOG.info('TRADING....', {
      fifaFut18Account: this.fifaFut18Account,
    });
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
