import { Injectable, Logger } from '@nestjs/common';

export interface WeatherAlert {
  id: string;
  type: 'WARNING' | 'CRITICAL' | 'INFO';
  title: string;
  message: string;
  category: 'LLUVIA' | 'TEMPERATURA' | 'VIENTO' | 'UV' | 'HUMEDAD';
}

const CESAR_MUNICIPALITIES: Record<string, { lat: number; lon: number; name: string }> = {
  valledupar: { lat: 10.4631, lon: -73.2532, name: 'Valledupar' },
  aguachica: { lat: 8.3094, lon: -73.6158, name: 'Aguachica' },
  'agustin codazzi': { lat: 10.0381, lon: -73.2356, name: 'Agustín Codazzi' },
  codazzi: { lat: 10.0381, lon: -73.2356, name: 'Agustín Codazzi' },
  bosconia: { lat: 9.9744, lon: -73.8864, name: 'Bosconia' },
  curumani: { lat: 9.1894, lon: -73.5511, name: 'Curumaní' },
  'el copey': { lat: 10.1558, lon: -73.9558, name: 'El Copey' },
  'la paz': { lat: 10.3842, lon: -73.1728, name: 'La Paz' },
  chiriguana: { lat: 9.3622, lon: -73.6067, name: 'Chiriguaná' },
  'san alberto': { lat: 7.7608, lon: -73.3933, name: 'San Alberto' },
  'san diego': { lat: 10.3364, lon: -73.1814, name: 'San Diego' },
  tamalameque: { lat: 8.8603, lon: -73.8131, name: 'Tamalameque' },
  chimichagua: { lat: 9.2556, lon: -73.8117, name: 'Chimichagua' },
  astrea: { lat: 9.4975, lon: -73.9781, name: 'Astrea' },
  pelaya: { lat: 8.6872, lon: -73.6589, name: 'Pelaya' },
  pailitas: { lat: 8.9592, lon: -73.6278, name: 'Pailitas' },
};

function wmoToDescription(code: number): string {
  switch (code) {
    case 0:
      return 'Cielo despejado';
    case 1:
      return 'Principalmente despejado';
    case 2:
      return 'Parcialmente nublado';
    case 3:
      return 'Nublado';
    case 45:
    case 48:
      return 'Niebla o neblina';
    case 51:
    case 53:
    case 55:
      return 'Llovizna';
    case 61:
      return 'Lluvia ligera';
    case 63:
      return 'Lluvia moderada';
    case 65:
      return 'Lluvia fuerte';
    case 80:
    case 81:
    case 82:
      return 'Chubascos dispersos';
    case 95:
      return 'Tormenta eléctrica';
    case 96:
    case 99:
      return 'Tormenta con granizo';
    default:
      return 'Condiciones estables';
  }
}

@Injectable()
export class ClimaService {
  private readonly logger = new Logger(ClimaService.name);

  /**
   * Resuelve coordenadas para un nombre de municipio o retorna las coordenadas directas.
   */
  async resolveCoordinates(ciudad?: string, lat?: number, lon?: number): Promise<{ lat: number; lon: number; name: string }> {
    if (lat !== undefined && lon !== undefined && !isNaN(Number(lat)) && !isNaN(Number(lon))) {
      return { lat: Number(lat), lon: Number(lon), name: ciudad || 'Ubicación de predio' };
    }

    if (!ciudad || !ciudad.trim()) {
      return CESAR_MUNICIPALITIES.valledupar;
    }

    const key = ciudad.toLowerCase().trim();
    if (CESAR_MUNICIPALITIES[key]) {
      return CESAR_MUNICIPALITIES[key];
    }

    // Try Open-Meteo Geocoding API
    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ciudad)}&count=1&language=es&format=json`;
      const res = await fetch(geoUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const first = data.results[0];
          return {
            lat: first.latitude,
            lon: first.longitude,
            name: `${first.name}${first.admin1 ? `, ${first.admin1}` : ''}`,
          };
        }
      }
    } catch (err) {
      this.logger.warn(`Geocoding error for "${ciudad}": ${err}`);
    }

    return CESAR_MUNICIPALITIES.valledupar;
  }

  /**
   * Consulta datos reales en Open-Meteo para latitud y longitud.
   */
  async fetchOpenMeteo(lat: number, lon: number) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,uv_index&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,wind_speed_10m_max&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Open-Meteo returned status ${res.status}`);
    }
    return res.json();
  }

  /**
   * Clima actual con todas las métricas solicitadas por el usuario y alertas generadas.
   */
  async getCurrentWeather(ciudad?: string, latParam?: number, lonParam?: number) {
    const coords = await this.resolveCoordinates(ciudad, latParam, lonParam);

    try {
      const data = await this.fetchOpenMeteo(coords.lat, coords.lon);
      const cur = data.current || {};
      const daily = data.daily || {};

      const temp = Math.round((cur.temperature_2m ?? 30) * 10) / 10;
      const sensacion = Math.round((cur.apparent_temperature ?? temp) * 10) / 10;
      const humedad = Math.round(cur.relative_humidity_2m ?? 60);
      const viento = Math.round((cur.wind_speed_10m ?? 10) * 10) / 10;
      const direccionViento = cur.wind_direction_10m ?? 0;
      const precipitacion = Math.round((cur.precipitation ?? 0) * 10) / 10;
      const presion = Math.round(cur.surface_pressure ?? 1013);
      const uvIndex = Math.round((cur.uv_index ?? 5) * 10) / 10;
      const weatherCode = cur.weather_code ?? 0;
      const descripcion = wmoToDescription(weatherCode);

      const probLluviaHoy = daily.precipitation_probability_max?.[0] ?? (precipitacion > 0 ? 85 : 10);

      // Generar alertas agrícolas automáticas basadas en datos reales
      const alerts = this.generarAlertasReales(coords.name, temp, humedad, viento, uvIndex, precipitacion, probLluviaHoy);

      // Recomendaciones agronómicas técnicas
      const recomendaciones = this.generarRecomendaciones(temp, humedad, viento, precipitacion, probLluviaHoy);

      // Pronóstico por horas (próximas 12-24 horas)
      const hourlyList = [];
      if (data.hourly?.time) {
        const now = new Date();
        for (let i = 0; i < Math.min(data.hourly.time.length, 24); i++) {
          const itemDate = new Date(data.hourly.time[i]);
          if (itemDate >= now || hourlyList.length < 12) {
            hourlyList.push({
              hora: itemDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
              temperatura: Math.round(data.hourly.temperature_2m[i]),
              probLluvia: data.hourly.precipitation_probability[i] ?? 0,
              humedad: data.hourly.relative_humidity_2m[i] ?? 0,
              descripcion: wmoToDescription(data.hourly.weather_code[i] ?? 0),
            });
            if (hourlyList.length >= 12) break;
          }
        }
      }

      return {
        ciudad: coords.name,
        coordenadas: { lat: coords.lat, lon: coords.lon },
        temperatura: temp,
        sensacionTermica: sensacion,
        humedad,
        velocidadViento: viento,
        direccionViento,
        precipitacion,
        probabilidadLluvia: probLluviaHoy,
        presion,
        indiceUv: uvIndex,
        descripcion,
        weatherCode,
        alertas: alerts,
        recomendaciones,
        hourly: hourlyList,
      };
    } catch (err) {
      this.logger.error(`Error fetching real weather for ${coords.name}: ${err}`);
      throw new Error('No fue posible actualizar los datos meteorológicos.');
    }
  }

  /**
   * Pronóstico de 7 días con datos reales de Open-Meteo.
   */
  async getForecast(ciudad?: string, latParam?: number, lonParam?: number) {
    const coords = await this.resolveCoordinates(ciudad, latParam, lonParam);

    try {
      const data = await this.fetchOpenMeteo(coords.lat, coords.lon);
      const daily = data.daily || {};

      const forecastList = [];
      if (daily.time && Array.isArray(daily.time)) {
        for (let i = 0; i < daily.time.length; i++) {
          const dateStr = daily.time[i];
          const d = new Date(dateStr + 'T12:00:00');
          forecastList.push({
            fecha: dateStr,
            dia: d.toLocaleDateString('es-CO', { weekday: 'short' }),
            tempMax: Math.round(daily.temperature_2m_max[i]),
            tempMin: Math.round(daily.temperature_2m_min[i]),
            precipitacionTotal: daily.precipitation_sum?.[i] ?? 0,
            probabilidadLluvia: daily.precipitation_probability_max?.[i] ?? 0,
            indiceUvMax: daily.uv_index_max?.[i] ?? 5,
            vientoMax: Math.round((daily.wind_speed_10m_max?.[i] ?? 10) * 10) / 10,
            descripcion: wmoToDescription(daily.weather_code?.[i] ?? 0),
          });
        }
      }

      return forecastList;
    } catch (err) {
      this.logger.error(`Error fetching real forecast for ${coords.name}: ${err}`);
      throw new Error('No fue posible actualizar los datos meteorológicos.');
    }
  }

  /**
   * getWeather utilizado por el Dashboard principal y módulos internos.
   */
  async getWeather(lat: number = 10.4631, lon: number = -73.2532) {
    try {
      const data = await this.fetchOpenMeteo(lat, lon);
      const cur = data.current || {};
      const daily = data.daily || {};

      const temp = Math.round((cur.temperature_2m ?? 32) * 10) / 10;
      const humedad = Math.round(cur.relative_humidity_2m ?? 60);
      const viento = Math.round((cur.wind_speed_10m ?? 12) * 10) / 10;
      const lluviaHoy = daily.precipitation_probability_max?.[0] ?? 15;
      const desc = wmoToDescription(cur.weather_code ?? 0);

      const forecast = [];
      if (daily.time) {
        for (let i = 0; i < Math.min(daily.time.length, 5); i++) {
          const d = new Date(daily.time[i] + 'T12:00:00');
          forecast.push({
            day: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : d.toLocaleDateString('es-CO', { weekday: 'short' }),
            temp: Math.round(daily.temperature_2m_max[i]),
            conditions: wmoToDescription(daily.weather_code?.[i] ?? 0),
            rainProb: daily.precipitation_probability_max?.[i] ?? 10,
          });
        }
      }

      const alerts = this.generarAlertasReales('Predio', temp, humedad, viento, cur.uv_index ?? 5, cur.precipitation ?? 0, lluviaHoy);

      return {
        location: 'Cesar, Colombia',
        temperature: temp,
        humidity: humedad,
        rainProbability: lluviaHoy,
        windSpeed: viento,
        conditions: desc,
        forecast,
        alerts,
      };
    } catch (err) {
      this.logger.error(`Error consultando clima real en Open-Meteo: ${err}`);
      return {
        location: 'Cesar, Colombia',
        temperature: null,
        humidity: null,
        rainProbability: null,
        windSpeed: null,
        conditions: 'Servicio meteorológico temporalmente no disponible',
        forecast: [],
        alerts: [],
        error: 'No se pudo obtener información meteorológica en tiempo real. Verifica la conexión a internet.',
      };
    }
  }

  private generarAlertasReales(
    lugar: string,
    temp: number,
    humedad: number,
    viento: number,
    uv: number,
    precipitacion: number,
    probLluvia: number
  ): WeatherAlert[] {
    const alerts: WeatherAlert[] = [];

    if (precipitacion > 5 || probLluvia >= 70) {
      alerts.push({
        id: 'lluvia-alta',
        type: 'WARNING',
        category: 'LLUVIA',
        title: `Lluvia prevista en ${lugar}`,
        message: `Probabilidad del ${probLluvia}% (${precipitacion} mm acumulados). Suspender labores de aspersión fitosanitaria y proteger cosechas en secado.`,
      });
    }

    if (temp >= 35) {
      alerts.push({
        id: 'calor-extremo',
        type: 'WARNING',
        category: 'TEMPERATURA',
        title: `Temperatura elevada (${temp}°C) en ${lugar}`,
        message: 'Riesgo de estrés térmico en ganado y alta evapotranspiración. Programe el riego en la madrugada o al atardecer.',
      });
    }

    if (viento >= 28) {
      alerts.push({
        id: 'viento-fuerte',
        type: 'WARNING',
        category: 'VIENTO',
        title: `Viento fuerte (${viento} km/h) en ${lugar}`,
        message: 'No realizar aplicaciones químicas foliares debido al riesgo de deriva descontrolada del producto.',
      });
    }

    if (uv >= 8) {
      alerts.push({
        id: 'uv-extremo',
        type: 'INFO',
        category: 'UV',
        title: `Radiación solar muy alta (Índice UV ${uv})`,
        message: 'Garantizar hidratación y protección solar para el personal de campo entre las 11:00 AM y 3:00 PM.',
      });
    }

    if (humedad >= 85 && temp >= 26) {
      alerts.push({
        id: 'humedad-hongos',
        type: 'WARNING',
        category: 'HUMEDAD',
        title: `Alerta fitosanitaria por humedad (${humedad}%)`,
        message: 'Condiciones propensas para la proliferación de hongos (roya, antracnosis o botrytis). Inspeccionar lotes sensibles.',
      });
    }

    return alerts;
  }

  private generarRecomendaciones(temp: number, humedad: number, viento: number, precip: number, probLluvia: number): string[] {
    const recs: string[] = [];

    if (probLluvia >= 60 || precip > 2) {
      recs.push('Probabilidad de lluvia significativa. Se desaconseja aplicar fertilizantes granulados en pendientes sin cobertura.');
      recs.push('Asegurar que los canales de drenaje de los potreros y lotes agrícolas se encuentren limpios.');
    } else {
      recs.push('Baja probabilidad de precipitaciones. Buen momento para labores de poda, mantenimiento de cercas y cosecha.');
    }

    if (temp >= 34) {
      recs.push('Programar ciclos de riego por goteo exclusivamente en horas tempranas (5:00 AM a 7:30 AM) para evitar pérdidas por evaporación.');
    } else {
      recs.push('Temperatura favorable para la asimilación de nutrientes en el suelo.');
    }

    if (viento > 25) {
      recs.push('Vientos fuertes detectados. Evitar la pulverización con boquillas cónicas para prevenir pérdidas por deriva.');
    }

    return recs;
  }
}
