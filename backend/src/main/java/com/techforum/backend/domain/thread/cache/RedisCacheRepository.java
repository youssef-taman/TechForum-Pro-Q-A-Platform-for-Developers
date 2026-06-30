package com.techforum.backend.domain.thread.cache;

import com.redis.om.spring.annotations.Query;
import com.redis.om.spring.repository.RedisDocumentRepository;
import java.util.List;
import org.springframework.data.repository.query.Param;

public interface RedisCacheRepository extends RedisDocumentRepository<TopThreadCache, String> {

  @Query("*=>[KNN $ @limit embedding $vector AS score]")
  List<TopThreadCache> findTopNearestThreads(
      @Param("vector") byte[] vector, @Param("limit") int limit);
}
