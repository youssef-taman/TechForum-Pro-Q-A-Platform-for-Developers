package com.techforum.backend.domain.user.mappers;

import com.techforum.backend.domain.user.User;
import com.techforum.backend.domain.user.dtos.UserDTO;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {

  UserDTO toDTO(User user);
}
