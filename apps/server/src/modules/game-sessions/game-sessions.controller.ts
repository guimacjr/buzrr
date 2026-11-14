import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  Header,
} from "@nestjs/common";
import {
  CurrentAccountUser,
  CurrentPlayerUser,
} from "../../common/decorators/current-user.decorator";
import type {
  AuthUser,
  PlayerAuthUser,
} from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { RateLimitGuard } from "../../common/guards/rate-limit.guard";
import { CreateRoomDto } from "./dto/create-room.dto";
import { joinRoomSchema, type JoinRoomBody } from "@buzrr/contract";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { GameSessionsService } from "./game-sessions.service";

@Controller("game-sessions")
export class GameSessionsController {
  constructor(private readonly gameSessions: GameSessionsService) {}

  @UseGuards(RateLimitGuard)
  @Post("join")
  join(
    @CurrentPlayerUser() player: PlayerAuthUser,
    @Body(new ZodValidationPipe(joinRoomSchema)) dto: JoinRoomBody,
  ) {
    return this.gameSessions.join(player.playerId, dto);
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @Get("registration/:code")
  registration(@Param("code") code: string) {
    return this.gameSessions.registrationFields(code);
  }

  @Get("results/:resultId/report")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="quiz-report.csv"')
  @Header("Cache-Control", "no-store")
  report(
    @CurrentAccountUser() user: AuthUser,
    @Param("resultId") resultId: string,
  ) {
    return this.gameSessions.downloadReport(user, resultId);
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @Get("player-play/:playerId")
  playerPlay(@Param("playerId") playerId: string) {
    return this.gameSessions.getPlayerPlayContext(playerId);
  }

  @Get("history")
  history(@CurrentAccountUser() user: AuthUser) {
    return this.gameSessions.getHistory(user);
  }

  @Get("results/:resultId")
  result(
    @CurrentAccountUser() user: AuthUser,
    @Param("resultId") resultId: string,
  ) {
    return this.gameSessions.getResult(user, resultId);
  }

  @Get(":roomId/lobby")
  adminLobby(
    @CurrentAccountUser() user: AuthUser,
    @Param("roomId") roomId: string,
  ) {
    return this.gameSessions.getAdminLobby(user, roomId);
  }

  @Post()
  create(@CurrentAccountUser() user: AuthUser, @Body() dto: CreateRoomDto) {
    return this.gameSessions.createRoom(user, dto);
  }

  @Post(":roomId/end")
  @HttpCode(HttpStatus.OK)
  endRoom(
    @CurrentAccountUser() user: AuthUser,
    @Param("roomId") roomId: string,
  ) {
    return this.gameSessions.endRoom(user, roomId);
  }

  @Delete(":roomId/players/:playerId")
  removePlayer(
    @CurrentAccountUser() user: AuthUser,
    @Param("roomId") roomId: string,
    @Param("playerId") playerId: string,
  ) {
    return this.gameSessions.removePlayerFromRoom(user, roomId, playerId);
  }

  @Post(":roomId/players/:playerId/ban")
  @HttpCode(HttpStatus.OK)
  banPlayer(
    @CurrentAccountUser() user: AuthUser,
    @Param("roomId") roomId: string,
    @Param("playerId") playerId: string,
  ) {
    return this.gameSessions.banPlayerFromRoom(user, roomId, playerId);
  }
}
