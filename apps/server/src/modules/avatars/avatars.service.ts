import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  avatarCatalogSchema,
  COLOR_AVATARS,
  BUILTIN_AVATAR_CATALOG,
  applyAvatarAction,
  type AvatarAction,
  type AvatarCatalog,
} from "@buzrr/contract";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import {
  MediaStorage,
  UnsupportedMediaError,
  MediaUnavailableError,
} from "../../common/storage/media-storage";
import { publicLocalUrl } from "../../common/storage/public-local-url";
import { sniffImage } from "../../common/storage/image-sniff";

@Injectable()
export class AvatarsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MediaStorage,
  ) {}
  private publicUrls(catalog: AvatarCatalog): AvatarCatalog {
    return {
      ...catalog,
      avatars: catalog.avatars.map((avatar) =>
        avatar.builtin
          ? avatar
          : { ...avatar, url: publicLocalUrl(avatar.url, this.storage.driver) },
      ),
    };
  }
  async catalog(): Promise<AvatarCatalog> {
    const row = await this.prisma.db.avatarCatalog.findUnique({
      where: { id: "global" },
    });
    return this.publicUrls(
      avatarCatalogSchema.parse(row?.data ?? BUILTIN_AVATAR_CATALOG),
    );
  }
  async publicCatalog() {
    const catalog = await this.catalog();
    if (catalog.mode === "colors")
      return {
        ...catalog,
        avatars: COLOR_AVATARS,
        defaultId: COLOR_AVATARS[0]!.id,
      };
    return { ...catalog, avatars: catalog.avatars.filter((a) => a.enabled) };
  }
  /** Compare-and-swap prevents parallel admin changes from losing uploads/settings. */
  private async mutate(
    change: (catalog: AvatarCatalog) => AvatarCatalog,
  ): Promise<AvatarCatalog> {
    await this.prisma.db.avatarCatalog.upsert({
      where: { id: "global" },
      create: { id: "global", data: BUILTIN_AVATAR_CATALOG },
      update: {},
    });
    for (let attempt = 0; attempt < 5; attempt++) {
      const row = await this.prisma.db.avatarCatalog.findUniqueOrThrow({
        where: { id: "global" },
      });
      let next: AvatarCatalog;
      try {
        next = change(avatarCatalogSchema.parse(row.data));
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : "Invalid avatar settings",
        );
      }
      const written = await this.prisma.db.avatarCatalog.updateMany({
        where: { id: "global", revision: row.revision },
        data: { data: next, revision: { increment: 1 } },
      });
      if (written.count) return this.publicUrls(next);
    }
    throw new ConflictException("Avatar settings changed. Please try again.");
  }
  update(action: AvatarAction) {
    return this.mutate((catalog) => applyAvatarAction(catalog, action));
  }
  async upload(file: Express.Multer.File | undefined, label: string) {
    if (!file?.size) throw new BadRequestException("Choose an image");
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
    const id = randomUUID();
    try {
      return await this.mutate((catalog) => ({
        ...catalog,
        avatars: [
          ...catalog.avatars,
          { id, label, url: uploaded.url, enabled: true, builtin: false },
        ],
      }));
    } catch (error) {
      await this.storage.remove(uploaded.url).catch(() => undefined);
      throw error;
    }
  }
  async assertSelectable(url: string) {
    const catalog = await this.publicCatalog();
    if (!catalog.avatars.some((a) => a.url === url))
      throw new BadRequestException(
        "This avatar is no longer available. Choose another avatar.",
      );
  }
}
