package com.example.back_end.config;

import io.netty.channel.ChannelOption;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Configuration
public class NvidiaConfig {

    private final NvidiaProperties props;

    public NvidiaConfig(NvidiaProperties props) {
        this.props = props;
    }

    /**
     * Shared WebClient for all NVIDIA API calls.
     * Align Netty response timeout with {@link NvidiaProperties#getTimeoutSeconds()}.
     */
    @Bean("nvidiaWebClient")
    public WebClient nvidiaWebClient() {
        int timeoutSec = Math.max(30, props.getTimeoutSeconds());
        HttpClient httpClient = HttpClient.create()
                .responseTimeout(Duration.ofSeconds(timeoutSec))
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, Math.min(120_000, timeoutSec * 1000));

        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(config -> config.defaultCodecs()
                        .maxInMemorySize(20 * 1024 * 1024))
                .build();

        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .exchangeStrategies(strategies)
                .defaultHeader("Authorization", "Bearer " + props.getApiKey())
                .defaultHeader("Content-Type", "application/json")
                .defaultHeader("Accept", "application/json")
                .build();
    }
}
