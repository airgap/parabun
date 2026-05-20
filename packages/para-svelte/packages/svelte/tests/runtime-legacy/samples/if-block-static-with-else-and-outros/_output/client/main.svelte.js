import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import EEE from './EEE.svelte';
import RRR from './RRR.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);
	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			EEE($$anchor, {});
		};

		var alternate = ($$anchor) => {
			RRR($$anchor, {});
		};

		$.if(node, ($$render) => {
			if (($.untrack(() => ("Eva").startsWith('E')))) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.append($$anchor, fragment);
	$.pop();
}