import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $missingGlobal = () => $.store_get(missingGlobal, '$missingGlobal', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();

	$.legacy_pre_effect(() => ($missingGlobal()), () => {
		$missingGlobal();
	});

	$.legacy_pre_effect_reset();
	$.pop();
	$$cleanup();
}