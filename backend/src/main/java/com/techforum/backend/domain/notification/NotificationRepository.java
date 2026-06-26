package com.techforum.backend.domain.notification;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

  Page<Notification> findByRecipientUsernameOrderByCreatedAtDesc(
      String username, Pageable pageable);

  @Modifying
  @Query(
      "UPDATE Notification n SET n.isRead = true WHERE n.id = :id AND n.recipientUsername = :username")
  void markAsRead(UUID id, String username);

  @Modifying
  @Query(
      "UPDATE Notification n SET n.isRead = true WHERE n.recipientUsername = :username AND n.isRead = false")
  void markAllAsRead(String username);
}
