package com.techforum.backend.domain.notification;

import com.techforum.backend.domain.notification.dtos.NotificationDTO;
import com.techforum.backend.domain.notification.mappers.NotificationMapper;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {

  private final NotificationRepository notificationRepository;
  private final NotificationMapper notificationMapper;

  public Page<NotificationDTO> getUserNotifications(String username, Pageable pageable) {
    return notificationRepository
        .findByRecipientUsernameOrderByCreatedAtDesc(username, pageable)
        .map(notificationMapper::toDto);
  }

  @Transactional
  public void markAsRead(UUID id, String username) {
    notificationRepository.markAsRead(id, username);
  }

  @Transactional
  public void markAllAsRead(String username) {
    notificationRepository.markAllAsRead(username);
  }

  @Transactional
  public NotificationDTO createNotification(
      String recipientUsername, String type, String message, String link) {
    Notification notification = new Notification();
    notification.setRecipientUsername(recipientUsername);
    notification.setType(type);
    notification.setMessage(message);
    notification.setLink(link);

    Notification saved = notificationRepository.save(notification);

    // Return the DTO so controllers can push it to the SSE stream
    return notificationMapper.toDto(saved);
  }
}
