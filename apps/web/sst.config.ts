import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
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
      const site = new SvelteKitSite(stack, "site", {
        customDomain: {
          isExternalDomain: true,
          domainName: "junction.tigerapps.org",
          cdk: {
            certificate: Certificate.fromCertificateArn(stack, "33579ba9-6a6d-4918-b2fe-587f745d2851", "arn:aws:acm:us-east-1:104733724423:certificate/33579ba9-6a6d-4918-b2fe-587f745d2851"),
          }
        }
      });
      stack.addOutputs({
        url: site.url,
      });

      // Calendar refresh cron job
      new Cron(stack, "calRefresh", {
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
