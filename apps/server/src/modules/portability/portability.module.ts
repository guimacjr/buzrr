import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { PortabilityController } from "./portability.controller";
import { PortabilityService } from "./portability.service";

@Module({
  imports: [BillingModule],
  controllers: [PortabilityController],
  providers: [PortabilityService],
})
export class PortabilityModule {}
