package com.techforum.backend.domain.ai;

import com.techforum.backend.domain.comment.Comment;
import com.techforum.backend.domain.comment.CommentRepository;
import com.techforum.backend.domain.thread.Thread;
import com.techforum.backend.domain.thread.ThreadRepository;
import com.techforum.backend.domain.user.User;
import com.techforum.backend.domain.user.UserRepository;
import jakarta.annotation.PostConstruct;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class LlmAgentClient {

  private static final UUID AI_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");

  private static final String SYSTEM_PROMPT =
      """
          You are TechForum AI, an expert software engineering assistant.
          Your job is to answer developer questions clearly and concisely.
          Format your response in plain text. No markdown.
          Be direct and technical. If you don't know, say so.
          """;

  private final ChatClient.Builder chatClientBuilder;
  private final CommentRepository commentRepository;
  private final ThreadRepository threadRepository;
  private final UserRepository userRepository;

  private ChatClient chatClient;

  @PostConstruct
  public void init() {
    this.chatClient = chatClientBuilder.build();
  }

  @Async
  @Transactional
  public void generateAndSaveAnswer(UUID threadId, String title, String body) {
    try {
      User aiUser =
          userRepository
              .findById(AI_USER_ID)
              .orElseThrow(() -> new IllegalStateException("AI user not found in DB"));

      Thread thread =
          threadRepository
              .findById(threadId)
              .orElseThrow(() -> new IllegalStateException("Thread not found: " + threadId));

      String answer =
          chatClient
              .prompt()
              .system(SYSTEM_PROMPT)
              .user(
                  u ->
                      u.text(
                              """
                                                      Title: {title}
                                                      Question: {content}
                                                      """)
                          .param("title", title)
                          .param("content", body))
              .call()
              .content();

      Comment aiComment =
          Comment.builder()
              .author(aiUser)
              .thread(thread)
              .parent(null)
              .content(answer)
              .score(0)
              .replyCount(0)
              .build();

      commentRepository.save(aiComment);

    } catch (Exception e) {
      log.error("Failed to generate AI answer for thread {}: {}", threadId, e.getMessage());
    }
  }
}
