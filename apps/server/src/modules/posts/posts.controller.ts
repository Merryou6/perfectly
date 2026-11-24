import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreatePostDto } from "./dto/create-post.dto";
import { ListPostsDto } from "./dto/list-posts.dto";
import { UpdatePostDto } from "./dto/update-post.dto";
import { PostsService } from "./posts.service";

@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  list(@Query() query: ListPostsDto) {
    return this.postsService.list(query);
  }

  @Get(":id")
  get(@Param("id", ParseIntPipe) id: number) {
    return this.postsService.get(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePostDto) {
    return this.postsService.create(user.sub, dto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.update(user, id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.postsService.remove(user, id);
    return null;
  }
}
