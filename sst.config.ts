import type { SSTConfig } from "sst";
import { Cron, SvelteKitSite } from "sst/constructs";

export default {
  config(_input) {
    return {
      name: "tiger-junction",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(function Site({ stack }) {
      const site = new SvelteKitSite(stack, "site");
      stack.addOutputs({
        url: site.url,
      });

      // Calendar refresh cron job
      new Cron(stack, "cron", {
        schedule: "rate(1 day)",
        job: {
          function: {
            handler: "src/lib/functions/refreshCals.handler",
          }
        }
      });
    });
  },
} satisfies SSTConfig;
