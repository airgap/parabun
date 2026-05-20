import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let pushLogs = $.prop($$props, 'pushLogs', 12);
	let tag = $.prop($$props, 'tag', 12, "h1");
	let opt = $.prop($$props, 'opt', 12, "opt1");

	function foo(node, { tag, opt }) {
		pushLogs()(`create: ${tag},${opt}`);

		return {
			update: ({ tag, opt }) => pushLogs()(`update: ${tag},${opt}`),
			destroy: () => pushLogs()('destroy')
		};
	}

	var $$exports = {
		get pushLogs() {
			return pushLogs();
		},

		set pushLogs($$value) {
			pushLogs($$value);
			$.flush();
		},

		get tag() {
			return tag();
		},

		set tag($$value) {
			tag($$value);
			$.flush();
		},

		get opt() {
			return opt();
		},

		set opt($$value) {
			opt($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node_1 = $.first_child(fragment);

	$.element(node_1, tag, false, ($$element, $$anchor) => {
		$.action($$element, ($$node, $$action_arg) => foo?.($$node, $$action_arg), () => ({ tag: tag(), opt: opt() }));

		var text = $.text();

		$.template_effect(() => $.set_text(text, `tag is ${tag() ?? ''}.`));
		$.append($$anchor, text);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}