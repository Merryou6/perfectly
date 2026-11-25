import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CommunityPageService } from "./community-page.service";
import {
  PublishPageSchemaDto,
  RollbackPageDto,
  SavePageSchemaDto,
} from "./dto/save-page-schema.dto";

@Controller("communities/:communityId/pages/:pageKey")
export class CommunityPageController {
  constructor(private readonly pages: CommunityPageService) {}

  @Get()
  getPublished(
    @Param("communityId", ParseIntPipe) communityId: number,
    @Param("pageKey") pageKey: string,
  ) {
    return this.pages.getPublished(communityId, pageKey);
  }

  @Get("draft")
  @UseGuards(JwtAuthGuard)
  getDraft(
    @CurrentUser() user: AuthUser,
    @Param("communityId", ParseIntPipe) communityId: number,
    @Param("pageKey") pageKey: string,
  ) {
    return this.pages.getDraftState(communityId, pageKey, user);
  }

  @Put("draft")
  @UseGuards(JwtAuthGuard)
  saveDraft(
    @CurrentUser() user: AuthUser,
    @Param("communityId", ParseIntPipe) communityId: number,
    @Param("pageKey") pageKey: string,
    @Body() dto: SavePageSchemaDto,
  ) {
    return this.pages.saveDraft(communityId, pageKey, user, dto.schema);
  }

  @Post("publish")
  @UseGuards(JwtAuthGuard)
  publish(
    @CurrentUser() user: AuthUser,
    @Param("communityId", ParseIntPipe) communityId: number,
    @Param("pageKey") pageKey: string,
    @Body() dto: PublishPageSchemaDto,
  ) {
    return this.pages.publish(communityId, pageKey, user, dto);
  }

  @Post("rollback")
  @UseGuards(JwtAuthGuard)
  rollback(
    @CurrentUser() user: AuthUser,
    @Param("communityId", ParseIntPipe) communityId: number,
    @Param("pageKey") pageKey: string,
    @Body() dto: RollbackPageDto,
  ) {
    return this.pages.rollback(communityId, pageKey, user, dto);
  }
}
