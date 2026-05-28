package com.techforum.backend.domain.ai;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class AiIntegrationService {

  @Value("${ai.service.url}")
  private String aiServiceUrl;

  private final RestTemplate restTemplate;

  public String[] getTags(String title, String body) {
    String codeExtracted = extractCode(body);
    String cleanBody = removeCode(body);

    var request = new TagRequest(title, cleanBody, codeExtracted);

    try {
      var response =
          restTemplate.postForEntity(aiServiceUrl + "/api/v1/tags", request, TagResponse.class);
      return response.getBody() != null ? response.getBody().tags() : new String[0];
    } catch (Exception e) {
      return new String[0];
    }
  }

  private String extractCode(String body) {
    StringBuilder code = new StringBuilder();
    int start;
    while ((start = body.indexOf("<code>")) != -1) {
      int end = body.indexOf("</code>", start);
      if (end == -1) break;
      code.append(body, start + 6, end).append(" ");
      body = body.substring(end + 7);
    }
    return code.toString().trim();
  }

  private String removeCode(String body) {
    return body.replaceAll("<code>[\\s\\S]*?</code>", "").trim();
  }

  record TagRequest(String title, String body, String code) {}

  record TagResponse(String[] tags) {}
}
