package com.techforum.backend.common.response;

import java.util.Map;
import lombok.Builder;

@Builder
public record ApiErrorResponse(int status, String message, Map<String, String> errors) {}
