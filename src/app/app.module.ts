import { BrowserModule } from '@angular/platform-browser';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TuioClient } from 'tuio-client';
import { Map } from 'ol-cityscope';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { TouchscreenComponent } from './touchscreen/touchscreen.component';
import { InfoscreenComponent } from './infoscreen/infoscreen.component';
import { MapComponent } from './map/map.component';
import { LegendComponent } from './map/legend/legend.component';
import { LayerControlComponent } from './map/layer-control/layer-control.component';
import { SafeHtmlPipe } from './util/safe-html.pipe';
import { YesNoUnknownPipe } from './util/yes-no-unknown.pipe';
import { ConfigurationService } from './configuration.service';
import { LocalStorageService } from './local-storage/local-storage.service';

import { PieComponent } from 'angular-dashboard-components/dist/charts/pie/pie.component';
import { LineComponent } from 'angular-dashboard-components/dist/charts/line/line.component';
import { WordCloudComponent } from 'angular-dashboard-components/dist/charts/word-cloud/word-cloud.component';
import { ChartUtils } from 'angular-dashboard-components/dist/utils/chart.utils';
import { ThemeUtils } from 'angular-dashboard-components/dist/utils/theme.utils';

@NgModule({
  declarations: [
    AppComponent,
    TouchscreenComponent,
    InfoscreenComponent,
    MapComponent,
    SafeHtmlPipe,
    YesNoUnknownPipe,
    LegendComponent,
    LayerControlComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule
  ],
  providers: [
    ConfigurationService,
    LocalStorageService,
    LineComponent,
    PieComponent,
    WordCloudComponent,
    ChartUtils,
    ThemeUtils,
    {
      provide: LocationStrategy,
      useClass: HashLocationStrategy
    },
    {
      provide: TuioClient,
      useFactory: () => new TuioClient({ enableCursorEvent: false })
    },
    {
      provide: Map,
      useFactory: (config: ConfigurationService) => new Map(config),
      deps: [ConfigurationService]
    }
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { }
