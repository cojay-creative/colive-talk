'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import { webSpeechService } from '../lib/speech';
import { freeTranslationService } from '../lib/translate';