import { config } from "dotenv";
import { resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

config({ path: resolve(process.cwd(), "../../.env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser("json", { limit: "15mb" });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.setGlobalPrefix("api", { exclude: ["health"] });

  const config = new DocumentBuilder()
    .setTitle("Timefairy API")
    .setDescription("Time tracking API")
    .setVersion("0.1")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.API_PORT ?? 3000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}

bootstrap();
