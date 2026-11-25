import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CommunityPageController } from "./community-page.controller";
import { CommunityPageService } from "./community-page.service";

@Module({
  imports: [AuthModule],
  controllers: [CommunityPageController],
  providers: [CommunityPageService],
})
export class CommunityPageModule {}
