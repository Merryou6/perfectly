import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { AuthModule } from "./modules/auth/auth.module";
import { CommunityModule } from "./modules/community/community.module";
import { CommunityPageModule } from "./modules/community-page/community-page.module";
import { HealthController } from "./modules/health/health.controller";
import { PostsModule } from "./modules/posts/posts.module";
import { UserModule } from "./modules/user/user.module";
import { PrismaModule } from "./prisma/prisma.module";
import { HttpExceptionFilter } from "./common/http-exception.filter";
import { PermissionModule } from "./common/permissions/permission.module";
import { ResponseInterceptor } from "./common/response.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
    }),
    PrismaModule,
    PermissionModule,
    AuthModule,
    CommunityModule,
    CommunityPageModule,
    PostsModule,
    UserModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
