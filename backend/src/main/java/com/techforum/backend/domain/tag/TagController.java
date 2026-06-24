package com.techforum.backend.domain.tag;

import com.techforum.backend.domain.tag.dtos.TagDTO;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/tags")
@RequiredArgsConstructor
public class TagController {

  private final TagService tagService;

  @GetMapping
  public ResponseEntity<List<TagDTO>> listTags() {
    return ResponseEntity.ok(tagService.listTags());
  }
}
