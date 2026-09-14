import { Injectable } from '@nestjs/common';

@Injectable()
export class ClimaService {
  private apiKey = process.env.WEATHER_API_KEY;

  async getWeather(lat: number = 10.4631, lon: number = -73.2532) {
    if (!this.apiKey) {
      return this.getMockWeather();
    }

    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=es&appid=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Error al conectar con la API de clima');
      const data = await response.json();

      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=es&appid=${this.apiKey}`;
      let forecastList: any[] = [];
      try {
        const fcRes = await fetch(forecastUrl);
        if (fcRes.ok) {
          const fcData = await fcRes.json();
          const dailyMap: { [key: string]: any } = {};
          for (const item of fcData.list || []) {
            const date = item.dt_txt.split(' ')[0];
            if (!dailyMap[date]) {
              dailyMap[date] = {
                day: new Date(item.dt_txt).toLocaleDateString('es-CO', { weekday: 'short' }),
                temp: Math.round(item.main.temp),
                conditions: item.weather[0]?.description || '',
                rainProb: Math.round((item.pop || 0) * 100),
              };
            }
          }
          forecastList = Object.values(dailyMap).slice(0, 5);
        }
      } catch (err) {
        console.log('Error fetching forecast in getWeather:', err);
      }

      return {
        location: `${data.name}, Cesar`,
        temperature: Math.round(data.main.temp * 10) / 10,
        humidity: data.main.humidity,
        rainProbability: forecastList[0]?.rainProb || 15,
        windSpeed: Math.round(data.wind.speed * 3.6 * 10) / 10,
        conditions: data.weather[0]?.description ? data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1) : 'Despejado',
        forecast: forecastList.length > 0 ? forecastList : [
          { day: 'Hoy', temp: Math.round(data.main.temp), conditions: data.weather[0]?.description || 'Despejado', rainProb: 15 },
        ],
        alerts: [],
      };
    } catch (error) {
      console.log('Error fetching real weather in getWeather:', error);
      return this.getMockWeather();
    }
  }

  private getMockWeather() {
    return {
      location: 'Valledupar, Cesar',
      temperature: 34.2,
      humidity: 58,
      rainProbability: 15,
      windSpeed: 14.2,
      conditions: 'Cielo mayormente despejado',
      forecast: [
        { day: 'Hoy', temp: 34.2, conditions: 'Despejado', rainProb: 15 },
        { day: 'Mañana', temp: 35.0, conditions: 'Muy caluroso', rainProb: 10 },
        { day: 'Sábado', temp: 32.5, conditions: 'Lluvia dispersa', rainProb: 65 },
        { day: 'Domingo', temp: 31.0, conditions: 'Lluvia y tormenta', rainProb: 80 },
        { day: 'Lunes', temp: 33.2, conditions: 'Parcialmente nublado', rainProb: 20 },
      ],
      alerts: [],
    };
  }

  async getCurrentWeather(ciudad: string) {
    if (!this.apiKey) {
      return this.getMockCurrent(ciudad);
    }

    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        ciudad,
      )}&units=metric&lang=es&appid=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Error al conectar con la API de clima');
      const data = await response.json();

      const temp = data.main.temp;
      const desc = data.weather[0]?.description || 'despejado';

      return {
        ciudad: data.name,
        temperatura: temp,
        sensacionTermica: data.main.feels_like,
        descripcion: desc.charAt(0).toUpperCase() + desc.slice(1),
        humedad: data.main.humidity,
        velocidadViento: Math.round(data.wind.speed * 3.6),
        visibilidad: data.visibility ? data.visibility / 1000 : undefined,
        presion: data.main.pressure,
        recomendaciones: this.generarRecomendaciones(temp, desc),
      };
    } catch (error) {
      console.log('Error fetching current weather:', error);
      return this.getMockCurrent(ciudad);
    }
  }

  async getForecast(ciudad: string) {
    if (!this.apiKey) {
      return this.getMockForecast(ciudad);
    }

    try {
      const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
        ciudad,
      )}&units=metric&lang=es&appid=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Error al conectar con la API de pronóstico');
      const data = await response.json();

      // Group by day (approximate by selecting every 8th slot)
      const forecastDays = data.list
        .filter((_: any, idx: number) => idx % 8 === 0)
        .map((item: any) => {
          return {
            fecha: item.dt_txt,
            tempMax: item.main.temp_max,
            tempMin: item.main.temp_min,
            descripcion: item.weather[0]?.description || 'despejado',
            lluvia: item.rain ? item.rain['3h'] || 0 : 0,
          };
        });

      return forecastDays;
    } catch (error) {
      console.log('Error fetching forecast:', error);
      return this.getMockForecast(ciudad);
    }
  }

  private generarRecomendaciones(temp: number, desc: string): string[] {
    const recs: string[] = [];
    const d = desc.toLowerCase();

    if (temp > 33) {
      recs.push('Altas temperaturas. Planificar riego en horas de menor evaporación (madrugada o noche).');
      recs.push('Monitorear el estrés hídrico en cultivos sensibles como hortalizas o frutales.');
    } else {
      recs.push('Temperatura templada. El riego regular programado es adecuado.');
    }

    if (d.includes('lluvia') || d.includes('tormenta') || d.includes('llovizna')) {
      recs.push('Lluvia detectada o pronosticada. Suspender temporalmente el riego automático para ahorrar agua.');
      recs.push('Vigilar el drenaje en lotes bajos para evitar encharcamientos y pudrición de raíz.');
      recs.push('Evitar aplicar fertilizantes foliares o plaguicidas, ya que el agua podría lavarlos.');
    } else {
      recs.push('Cielo seco. Buen momento para realizar aplicaciones fitosanitarias terrestres.');
    }

    recs.push('Mantener el monitoreo de plagas que proliferan en condiciones de clima cálido.');
    return recs;
  }

  private getMockCurrent(ciudad: string) {
    const cNormalized = ciudad.charAt(0).toUpperCase() + ciudad.slice(1).toLowerCase();
    const isLluvia = cNormalized === 'Pailitas' || cNormalized === 'San Alberto'; // Make some variety
    const temp = isLluvia ? 28.5 : 34.2 + (cNormalized.length % 3);
    const desc = isLluvia ? 'lluvia ligera' : 'cielo mayormente despejado';

    return {
      ciudad: `${cNormalized}, Cesar (Demo)`,
      temperatura: temp,
      sensacionTermica: temp + 2.3,
      descripcion: desc.charAt(0).toUpperCase() + desc.slice(1),
      humedad: isLluvia ? 82 : 55,
      velocidadViento: 12 + (cNormalized.length % 5),
      visibilidad: 10,
      presion: 1011,
      recomendaciones: this.generarRecomendaciones(temp, desc),
    };
  }

  private getMockForecast(ciudad: string) {
    const cNormalized = ciudad.charAt(0).toUpperCase() + ciudad.slice(1).toLowerCase();
    const list = [];
    const baseTemp = 32 + (cNormalized.length % 4);

    for (let i = 0; i < 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const isRainyDay = (i === 2 || i === 3) && (cNormalized.length % 2 === 0);

      list.push({
        fecha: date.toISOString().split('T')[0],
        tempMax: baseTemp + (i % 2) - (isRainyDay ? 4 : 0),
        tempMin: baseTemp - 8 - (i % 3),
        descripcion: isRainyDay ? 'Lluvia dispersa' : 'Cielo despejado',
        lluvia: isRainyDay ? 4.5 + i : 0,
      });
    }

    return list;
  }
}

