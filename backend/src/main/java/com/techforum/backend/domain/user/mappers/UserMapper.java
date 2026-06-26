package com.techforum.backend.domain.user.mappers;

import com.techforum.backend.domain.user.User;
import com.techforum.backend.domain.user.dtos.UserDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserMapper {

  // @Mapping(target = "isSuspended", ignore = true)
  @Mapping(target = "isSuspended", constant = "false")
  UserDTO toDTO(User user);
}
