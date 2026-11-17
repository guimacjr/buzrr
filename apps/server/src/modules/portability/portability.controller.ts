import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  PACKAGE_MAX_BYTES,
  bulkQuizTargetsSchema,
  appearanceImportOptionsSchema,
} from "@buzrr/contract";
import {
  CurrentAccountUser,
  type AuthUser,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { RateLimitGuard } from "../../common/guards/rate-limit.guard";
import { PortabilityService } from "./portability.service";

const upload = () =>
  FileInterceptor("file", {
    limits: {
      fileSize: PACKAGE_MAX_BYTES,
      files: 1,
      fields: 1,
      fieldSize: 4096,
    },
  });
function bytes(file?: Express.Multer.File) {
  if (!file?.buffer?.length)
    throw new BadRequestException("Escolha um pacote ZIP.");
  return file.buffer;
}
function download(buffer: Buffer, filename: string) {
  return new StreamableFile(buffer, {
    type: "application/zip",
    disposition: `attachment; filename="${filename}.buzrr.zip"`,
  });
}

@Controller("packages")
@UseGuards(RateLimitGuard)
export class PortabilityController {
  constructor(private readonly packages: PortabilityService) {}

  @Get("quizzes/:id")
  @Header("Cache-Control", "no-store")
  async exportQuiz(
    @CurrentAccountUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return download(await this.packages.exportQuiz(user.userId, id), "quiz");
  }

  @Post("quizzes/preview")
  @UseInterceptors(upload())
  previewQuiz(
    @CurrentAccountUser() _user: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.packages.preview(bytes(file), "quiz");
  }

  @Post("quizzes/import")
  @UseInterceptors(upload())
  importQuiz(
    @CurrentAccountUser() user: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.packages.importQuiz(user.userId, bytes(file));
  }

  @Post("quizzes/import-bulk")
  @UseGuards(RolesGuard)
  @Roles("superadmin")
  @UseInterceptors(upload())
  importQuizBulk(
    @CurrentAccountUser() _user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body("userIds") raw: string | undefined,
  ) {
    let input: unknown;
    try {
      input = JSON.parse(raw ?? "null");
    } catch {
      throw new BadRequestException("Contas inválidas.");
    }
    const parsed = bulkQuizTargetsSchema.safeParse(input);
    if (!parsed.success)
      throw new BadRequestException("Selecione de 1 a 100 contas distintas.");
    return this.packages.importQuizBulk(parsed.data, bytes(file));
  }

  @Get("appearance")
  @Header("Cache-Control", "no-store")
  @UseGuards(RolesGuard)
  @Roles("admin", "superadmin")
  async exportAppearance() {
    return download(await this.packages.exportAppearance(), "personalizacao");
  }

  @Post("appearance/preview")
  @UseGuards(RolesGuard)
  @Roles("admin", "superadmin")
  @UseInterceptors(upload())
  previewAppearance(@UploadedFile() file?: Express.Multer.File) {
    return this.packages.preview(bytes(file), "appearance");
  }

  @Post("appearance/import")
  @UseGuards(RolesGuard)
  @Roles("admin", "superadmin")
  @UseInterceptors(upload())
  importAppearance(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body("options") raw: string | undefined,
  ) {
    let input: unknown;
    try {
      input = JSON.parse(raw ?? "{}");
    } catch {
      throw new BadRequestException("Opções de importação inválidas.");
    }
    const result = appearanceImportOptionsSchema.safeParse(input);
    if (!result.success)
      throw new BadRequestException("Escolha quais personalizações aplicar.");
    return this.packages.importAppearance(bytes(file), result.data);
  }
}
