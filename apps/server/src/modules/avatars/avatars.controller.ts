import {
  Body,
  Controller,
  Get,
  Header,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  avatarActionSchema,
  type AvatarAction,
  avatarSchema,
} from "@buzrr/contract";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { AvatarsService } from "./avatars.service";

@Controller("avatars")
export class AvatarsController {
  constructor(private readonly avatars: AvatarsService) {}
  @Public()
  @Get()
  @Header("Cache-Control", "no-store")
  list() {
    return this.avatars.publicCatalog();
  }

  @Get("manage")
  @UseGuards(RolesGuard)
  @Roles("admin", "superadmin")
  manage() {
    return this.avatars.catalog();
  }

  @Patch()
  @UseGuards(RolesGuard)
  @Roles("admin", "superadmin")
  update(@Body(new ZodValidationPipe(avatarActionSchema)) body: AvatarAction) {
    return this.avatars.update(body);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("admin", "superadmin")
  @UseInterceptors(FileInterceptor("file"))
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body(new ZodValidationPipe(avatarSchema.pick({ label: true })))
    body: { label: string },
  ) {
    return this.avatars.upload(file, body.label);
  }
}
