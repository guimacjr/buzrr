import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { themeSettingsSchema, type ThemeSettings } from "@buzrr/contract";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { BrandingService } from "./branding.service";

@Controller("branding")
export class BrandingController {
  constructor(private readonly branding: BrandingService) {}
  @Public()
  @Get()
  @Header("Cache-Control", "no-store")
  read() {
    return this.branding.read();
  }
  @Patch()
  @UseGuards(RolesGuard)
  @Roles("admin", "superadmin")
  colors(
    @Body(new ZodValidationPipe(themeSettingsSchema)) body: ThemeSettings,
  ) {
    return this.branding.colors(body);
  }
  @Post("logo")
  @UseGuards(RolesGuard)
  @Roles("admin", "superadmin")
  @UseInterceptors(FileInterceptor("file"))
  logo(@UploadedFile() file?: Express.Multer.File) {
    return this.branding.logo(file);
  }
  @Delete("logo")
  @UseGuards(RolesGuard)
  @Roles("admin", "superadmin")
  resetLogo() {
    return this.branding.resetLogo();
  }
}
