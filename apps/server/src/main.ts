import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const config = app.get(ConfigService);
  const allowedOrigins = config
    .get<string>("WEB_ORIGIN", "http://localhost:10086")
    .split(",")
    .map((origin) => origin.trim());

  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: allowedOrigins,
    credentials: false,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = config.get<number>("PORT", 3000);
  await app.listen(port, "0.0.0.0");
  console.log(`Perfectly API listening on http://localhost:${port}/api/v1`);
}

void bootstrap();
