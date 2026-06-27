package com.techforum.backend.domain.ai;

import com.techforum.backend.domain.comment.Comment;
import com.techforum.backend.domain.comment.CommentRepository;
import com.techforum.backend.domain.thread.Thread;
import com.techforum.backend.domain.thread.ThreadRepository;
import com.techforum.backend.domain.thread.dtos.ThreadCreatedEvent;
import com.techforum.backend.domain.user.User;
import com.techforum.backend.domain.user.UserRepository;
import jakarta.annotation.PostConstruct;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class LlmAgentClient {

  private static final UUID AI_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");

  private static final String SYSTEM_PROMPT =
      """
                  You are TechForum AI, an expert software engineering assistant.
                  Your job is to answer developer questions clearly and concisely.
                  Format your response in markdown.
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
  @Transactional(propagation = Propagation.REQUIRES_NEW)
  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void handleThreadCreated(ThreadCreatedEvent event) {
    try {
      User aiUser =
          userRepository
              .findById(AI_USER_ID)
              .orElseThrow(() -> new IllegalStateException("AI user not found in DB"));

      Thread thread =
          threadRepository
              .findById(event.threadId())
              .orElseThrow(
                  () -> new IllegalStateException("Thread not found in DB: " + event.threadId()));

      String answer =
          chatClient
              .prompt()
              .system(SYSTEM_PROMPT)
              .user(
                  u ->
                      u.text("Title: {title}\nQuestion: {content}")
                          .param("title", event.title())
                          .param("content", event.body()))
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
      log.error("Failed to generate AI comment for thread: {}", event.threadId(), e);
    }
  }
}
