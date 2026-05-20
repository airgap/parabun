import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { DEV } from "esm-env";

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	if (DEV) {
		throw new Error("Dev-only code must not run");
	}

	$.pop();
}