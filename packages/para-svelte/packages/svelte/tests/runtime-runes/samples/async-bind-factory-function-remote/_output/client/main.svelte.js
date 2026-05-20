import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<!> <!> <!> <!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	const checkedFactory = () => {
		return () => $.get(checked);
	};

	function indirectCheckedFactory() {
		return checkedFactory();
	}

	function callFactory(factory) {
		return factory();
	}

	function indirectCallFactory() {
		return callFactory(indirectCheckedFactory);
	}

	function indirectChecked2() {
		const indirect = () => checkedFactory()();

		return indirect;
	}

	var checked;

	var $$promises = $.run([
		async () => checked = await $.async_derived(() => new Promise((r) => setTimeout(() => r(true)), 10))
	]);

	var fragment = root();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var text = $.text();

			$.template_effect(($0) => $.set_text(text, $0), [() => checkedFactory()()], void 0, [$$promises[0]]);
			$.append($$anchor, text);
		};

		$.if(node, ($$render) => {
			if (true) $$render(consequent);
		});
	}

	var node_1 = $.sibling(node, 2);

	{
		var consequent_1 = ($$anchor) => {
			var text_1 = $.text();

			$.template_effect(($0) => $.set_text(text_1, $0), [() => indirectCheckedFactory()()], void 0, [$$promises[0]]);
			$.append($$anchor, text_1);
		};

		$.if(node_1, ($$render) => {
			if (true) $$render(consequent_1);
		});
	}

	var node_2 = $.sibling(node_1, 2);

	{
		var consequent_2 = ($$anchor) => {
			var text_2 = $.text();

			$.template_effect(($0) => $.set_text(text_2, $0), [() => callFactory(checkedFactory)()], void 0, [$$promises[0]]);
			$.append($$anchor, text_2);
		};

		$.if(node_2, ($$render) => {
			if (true) $$render(consequent_2);
		});
	}

	var node_3 = $.sibling(node_2, 2);

	{
		var consequent_3 = ($$anchor) => {
			var text_3 = $.text();

			$.template_effect(($0) => $.set_text(text_3, $0), [() => indirectCallFactory()()], void 0, [$$promises[0]]);
			$.append($$anchor, text_3);
		};

		$.if(node_3, ($$render) => {
			if (true) $$render(consequent_3);
		});
	}

	var node_4 = $.sibling(node_3, 2);

	{
		var consequent_4 = ($$anchor) => {
			var text_4 = $.text();

			$.template_effect(($0) => $.set_text(text_4, $0), [() => indirectChecked2()()], void 0, [$$promises[0]]);
			$.append($$anchor, text_4);
		};

		$.if(node_4, ($$render) => {
			if (true) $$render(consequent_4);
		});
	}

	$.append($$anchor, fragment);
	$.pop();
}