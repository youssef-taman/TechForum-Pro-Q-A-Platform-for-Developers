package com.techforum.backend.common.config;

import com.redis.om.spring.annotations.EnableRedisDocumentRepositories;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableRedisDocumentRepositories(basePackages = "com.techforum.backend.domain.thread.cache")
public class RedisConfig {}
