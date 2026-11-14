import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  brandingSchema,
  DEFAULT_BRANDING,
  type ThemeSettings,
} from "@buzrr/contract";
import { PrismaService } from "../../prisma/prisma.service";
import {
  MediaStorage,
  MediaUnavailableError,
  UnsupportedMediaError,
} from "../../common/storage/media-storage";
import { publicLocalUrl } from "../../common/storage/public-local-url";
import { sniffImage } from "../../common/storage/image-sniff";

@Injectable()
export class BrandingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MediaStorage,
  ) {}
  async read() {
    const row = await this.prisma.db.brandingSettings.findUnique({
      where: { id: "global" },
    });
    const branding = brandingSchema.parse(
      row
        ? { light: row.light, dark: row.dark, logoUrl: row.logoUrl }
        : DEFAULT_BRANDING,
    );
    return {
      ...branding,
      logoUrl: branding.logoUrl
        ? publicLocalUrl(branding.logoUrl, this.storage.driver)
        : null,
    };
  }
  async colors(body: ThemeSettings) {
    await this.prisma.db.brandingSettings.upsert({
      where: { id: "global" },
      create: { id: "global", ...body },
      update: body,
    });
    return this.read();
  }
  async logo(file: Express.Multer.File | undefined) {
    if (!file?.size) throw new BadRequestException("Choose a logo image");
    let uploaded;
    try {
      sniffImage(file.buffer);
      uploaded = await this.storage.upload(file.buffer, {
        contentType: file.mimetype,
        filename: file.originalname,
      });
    } catch (error) {
      if (error instanceof UnsupportedMediaError)
        throw new BadRequestException(error.message);
      if (error instanceof MediaUnavailableError)
        throw new ServiceUnavailableException(error.message);
      throw error;
    }
    try {
      await this.prisma.db.brandingSettings.upsert({
        where: { id: "global" },
        create: {
          id: "global",
          light: DEFAULT_BRANDING.light,
          dark: DEFAULT_BRANDING.dark,
          logoUrl: uploaded.url,
        },
        update: { logoUrl: uploaded.url },
      });
    } catch (error) {
      await this.storage.remove(uploaded.url).catch(() => undefined);
      throw error;
    }
    // Retain previously published URLs for clients with cached settings.
    return this.read();
  }
  async resetLogo() {
    await this.prisma.db.brandingSettings.updateMany({
      where: { id: "global" },
      data: { logoUrl: null },
    });
    return this.read();
  }
}
