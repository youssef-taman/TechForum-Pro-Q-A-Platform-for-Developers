package com.techforum.backend.domain.tag;

import com.techforum.backend.domain.tag.dtos.TagDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Tags", description = "Endpoints for retrieving available thread tags")
@RestController
@RequestMapping("/tags")
@RequiredArgsConstructor
public class TagController {

  private final TagService tagService;

  @Operation(
      summary = "List all tags",
      description =
          "Returns a flat list of all tags available for use on threads. "
              + "This endpoint is public and does not require authentication.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Tags returned successfully",
            content =
                @Content(array = @ArraySchema(schema = @Schema(implementation = TagDTO.class))))
      })
  @GetMapping
  public ResponseEntity<List<TagDTO>> listTags() {
    return ResponseEntity.ok(tagService.listTags());
  }
}
