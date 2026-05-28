package com.techforum.backend.domain.tag;

import com.techforum.backend.domain.tag.dtos.TagDTO;
import com.techforum.backend.domain.tag.mappers.TagMapper;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TagService {

  private final TagRepository tagRepository;
  private final TagMapper tagMapper;

  public List<TagDTO> listTags() {
    return tagRepository.findAll().stream().map(tagMapper::toDTO).toList();
  }
}
