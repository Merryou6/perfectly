import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CommunityService } from "./community.service";
import { JoinCommunityDto } from "./dto/join-community.dto";
import { ListCommunitiesDto } from "./dto/list-communities.dto";

@Controller("communities")
export class CommunityController {
  constructor(private readonly communities: CommunityService) {}

  @Get()
  list(@Query() query: ListCommunitiesDto) {
    return this.communities.list(query);
  }

  @Get(":id/me")
  @UseGuards(JwtAuthGuard)
  getViewerState(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.communities.getViewerState(id, user.sub);
  }

  @Get(":id")
  get(@Param("id", ParseIntPipe) id: number) {
    return this.communities.get(id);
  }

  @Post(":id/join")
  @UseGuards(JwtAuthGuard)
  join(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: JoinCommunityDto,
  ) {
    return this.communities.join(id, user, dto);
  }
}
