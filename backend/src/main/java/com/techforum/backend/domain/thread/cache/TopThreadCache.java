package com.techforum.backend.domain.thread.cache;

import com.redis.om.spring.annotations.Document;
import com.redis.om.spring.annotations.Indexed;
import com.redis.om.spring.indexing.DistanceMetric;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.ReadOnlyProperty;
import redis.clients.jedis.search.schemafields.VectorField.VectorAlgorithm;

@Data
@Document("top_threads")
public class TopThreadCache {

  @Id private String threadId;

  @Indexed(
      algorithm = VectorAlgorithm.SVS_VAMANA,
      distanceMetric = DistanceMetric.COSINE,
      dimension = 768)
  private byte[] embedding;

  @ReadOnlyProperty private Double score;
}
