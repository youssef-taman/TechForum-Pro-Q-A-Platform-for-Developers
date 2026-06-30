package com.techforum.backend.domain.notification.mappers;

import com.techforum.backend.domain.notification.Notification;
import com.techforum.backend.domain.notification.dtos.NotificationDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface NotificationMapper {
  @Mapping(target = "isRead", constant = "false")
  NotificationDTO toDto(Notification notification);
}
