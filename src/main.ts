import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilitar CORS para que no te bloquee peticiones externas
  app.enableCors();

  // OBTENER EL PUERTO DE LA NUBE O USAR 3000 POR DEFECTO
  const port = process.env.PORT || 3000;
  
  // ESCUCHAR EN 0.0.0.0 (Vital para Render/Railway)
  await app.listen(port, '0.0.0.0');
  
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();