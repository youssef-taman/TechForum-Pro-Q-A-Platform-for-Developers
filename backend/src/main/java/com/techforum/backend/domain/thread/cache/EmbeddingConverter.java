package com.techforum.backend.domain.thread.cache;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;

public class EmbeddingConverter {
  public static byte[] toLittleEndian(float[] floats) {
    ByteBuffer buffer = ByteBuffer.allocate(floats.length * 4);
    buffer.order(ByteOrder.LITTLE_ENDIAN);
    for (float f : floats) buffer.putFloat(f);
    return buffer.array();
  }
}
