import * as React from 'react';
import _ from 'lodash';
import { observer } from 'mobx-react';
import classNames from 'classnames';
import { observable, action, makeObservable } from 'mobx';
import {
    getCanonicalMutationType,
    DefaultTooltip,
} from 'cbioportal-frontend-commons';
import {
    VariantAnnotationSummary,
    TranscriptConsequenceSummary,
} from 'genome-nexus-ts-api-client';
import { CancerGene as Gene, IndicatorQueryResp } from 'oncokb-ts-api-client';
import { Mutation } from 'cbioportal-utils';
import TranscriptSummaryTable from './TranscriptSummaryTable';
import { generateOncokbLink, ONCOKB_URL } from './biologicalFunction/Oncokb';

import basicInfo from './BasicInfo.module.scss';
import { Link } from 'react-router-dom';
import { annotationQueryFields } from '../../config/configDefaults';
import Toggle from '../Toggle';
import { ReVUEContent } from './biologicalFunction/ReVUE';
import { isVue } from '../../util/variantUtils';

interface IBasicInfoProps {
    isIGV: boolean;
    annotation: VariantAnnotationSummary | undefined;
    mutation: Mutation;
    variant: string;
    oncokbGenesMap: { [hugoSymbol: string]: Gene };
    oncokb: IndicatorQueryResp | undefined;
    selectedTranscript: string;
    isCanonicalTranscriptSelected?: boolean | undefined;
    allValidTranscripts: string[];
    onTranscriptSelect(transcriptId: string): void;
}

type MutationTypeFormat = {
    label?: string;
    className: string;
};

type OncogeneTsg = {
    oncogene?: boolean | undefined;
    tsg?: boolean | undefined;
};

// MAIN_MUTATION_TYPE_MAP comes from react-mutation-mapper
// TODO probably should get this from cbioportal-frontend-commons or react-mutation-mapper
export const MAIN_MUTATION_TYPE_MAP: { [key: string]: MutationTypeFormat } = {
    missense: {
        label: 'Missense',
        className: 'missense-mutation',
    },
    inframe: {
        label: 'IF',
        className: 'inframe-mutation',
    },
    truncating: {
        label: 'Truncating',
        className: 'trunc-mutation',
    },
    nonsense: {
        label: 'Nonsense',
        className: 'trunc-mutation',
    },
    nonstop: {
        label: 'Nonstop',
        className: 'trunc-mutation',
    },
    nonstart: {
        label: 'Nonstart',
        className: 'trunc-mutation',
    },
    frameshift: {
        label: 'FS',
        className: 'trunc-mutation',
    },
    frame_shift_del: {
        label: 'FS del',
        className: 'trunc-mutation',
    },
    frame_shift_ins: {
        label: 'FS ins',
        className: 'trunc-mutation',
    },
    in_frame_ins: {
        label: 'IF ins',
        className: 'inframe-mutation',
    },
    in_frame_del: {
        label: 'IF del',
        className: 'inframe-mutation',
    },
    splice_site: {
        label: 'Splice',
        className: 'trunc-mutation',
    },
    fusion: {
        label: 'Fusion',
        className: 'fusion',
    },
    silent: {
        label: 'Silent',
        className: 'other-mutation',
    },
    other: {
        label: 'Other',
        className: 'other-mutation',
    },
};

export type BasicInfoData = {
    value: string | null;
    key: string;
    category?: string;
};

@observer
export default class BasicInfo extends React.Component<IBasicInfoProps> {
    @observable showAllTranscripts = false;

    constructor(props: IBasicInfoProps) {
        super(props);
        makeObservable(this);
    }

    public render() {
        const haveTranscriptTable = this.haveTranscriptTable(
            this.props.annotation
        );
        const selectedTranscript =
            this.props.annotation &&
            _.find(
                this.props.annotation.transcriptConsequenceSummaries,
                (consequenceSummary) =>
                    consequenceSummary.transcriptId ===
                    this.props.selectedTranscript
            );
        const canonicalTranscript =
            this.props.annotation &&
            this.props.annotation.transcriptConsequenceSummary;
        if (this.props.annotation) {
            let renderData: BasicInfoData[] | null =
                this.getDataFromTranscriptConsequenceSummary(
                    selectedTranscript || canonicalTranscript,
                    this.props.variant
                );
            if (renderData) {
                renderData = renderData.filter((data) => data.value != null); // remove null fields
            }

            if (renderData === null) {
                if (this.props.isIGV) {
                    renderData = [
                        {
                            value: 'Intergenic Variant',
                            key: 'variantType',
                            category: 'mutation',
                        },
                        {
                            value: this.props.variant,
                            key: 'hgvsg',
                            category: 'hgvsg',
                        },
                    ];
                } else return null;
            }

            // if variant is VUE, remove hgvsShort and variantClassification
            // Show revised hgvsShort and variantClassification in VUE block instead
            // Otherwise show all fields
            const showVue = isVue(
                this.props.annotation,
                this.props.selectedTranscript
            );
            const keysBeforeVue = showVue
                ? ['hugoGeneSymbol', 'oncogene', 'tsg']
                : [
                      'hugoGeneSymbol',
                      'oncogene',
                      'tsg',
                      'hgvsShort',
                      'variantClassification',
                  ];
            const keysAfterVue = [
                'variantType',
                'hgvsg',
                'hgvsc',
                'transcript',
                'refSeq',
            ];
            const keysForIGV = ['variantType', 'hgvsg'];
            return (
                <div className={basicInfo['basic-info-container']}>
                    <span className={basicInfo['basic-info-pills']}>
                        {this.props.isIGV &&
                            this.getPillList(keysForIGV, renderData)}
                        {!this.props.isIGV && (
                            <>
                                {this.getPillList(keysBeforeVue, renderData)}
                                {showVue &&
                                    this.generateBasicInfoReVUE(
                                        this.props.annotation
                                    )}
                                {this.getPillList(keysAfterVue, renderData)}
                            </>
                        )}
                        {this.jsonButton()}
                        {haveTranscriptTable &&
                            this.transcriptsButton(this.showAllTranscripts)}
                    </span>
                    <TranscriptSummaryTable
                        annotation={this.props.annotation}
                        isOpen={this.showAllTranscripts}
                        allValidTranscripts={this.props.allValidTranscripts}
                        onTranscriptSelect={this.props.onTranscriptSelect}
                    />
                    {this.showAllTranscripts && haveTranscriptTable && (
                        <div className={basicInfo['transcript-table-source']}>
                            <span className={'text-muted small'}>
                                Data in the table comes from&nbsp;
                                <a
                                    href={
                                        'https://useast.ensembl.org/info/docs/tools/vep/index.html'
                                    } // TODO goes to VEP variant page
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    VEP
                                </a>
                            </span>
                            .&nbsp;&nbsp;&nbsp;
                            <div
                                className={'position-absolute'}
                                style={{ left: '50%', top: 0 }}
                            >
                                {this.transcriptsButton(
                                    this.showAllTranscripts
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        } else {
            return null;
        }
    }

    public getDataFromTranscriptConsequenceSummary(
        transcript: TranscriptConsequenceSummary | undefined,
        variant: string
    ): BasicInfoData[] | null {
        // no canonical transcript, return null
        if (transcript === undefined) {
            return null;
        }
        let parsedData: BasicInfoData[] = [];
        // gene
        parsedData.push({
            value: transcript.hugoGeneSymbol,
            key: 'hugoGeneSymbol',
            category: 'gene',
        });
        // oncogene
        parsedData.push({
            value: getOncogeneFromOncokbGenesMap(
                this.props.oncokbGenesMap,
                transcript.hugoGeneSymbol
            ),
            key: 'oncogene',
            category: 'oncogene',
        });
        // tsg
        parsedData.push({
            value: getTsgFromOncokbGenesMap(
                this.props.oncokbGenesMap,
                transcript.hugoGeneSymbol
            ),
            key: 'tsg',
            category: 'tsg',
        });

        // protein change
        parsedData.push({
            value: transcript.hgvspShort,
            key: 'hgvsShort',
            category: 'default',
        });
        // variant classification
        parsedData.push({
            value: transcript.variantClassification,
            key: 'variantClassification',
            category: getMutationTypeClassName(transcript),
        });

        // variant type
        parsedData.push({
            value: this.props.annotation!.variantType,
            key: 'variantType',
            category: 'mutation',
        });
        // hgvsg
        parsedData.push({
            value: this.props.variant,
            key: 'hgvsg',
            category: 'hgvsg',
        });
        //hgvsc
        parsedData.push({
            value: this.parseHgvscFromTranscriptConsequenceSummary(transcript),
            key: 'hgvsc',
            category: 'default',
        });
        // transcript id
        parsedData.push({
            value: transcript.transcriptId,
            key: 'transcript',
            category: 'default',
        });
        // ref seq
        parsedData.push({
            value: transcript.refSeq,
            key: 'refSeq',
            category: 'default',
        });
        return parsedData;
    }

    private parseHgvscFromTranscriptConsequenceSummary(
        transcript: TranscriptConsequenceSummary
    ) {
        if (transcript.hgvsc) {
            let hgvsc = transcript.hgvsc;
            let startIndex = hgvsc.indexOf('c.');
            return startIndex !== -1 ? hgvsc.substr(startIndex) : null;
        }
        return null;
    }

    private haveTranscriptTable(
        annotation: VariantAnnotationSummary | undefined
    ): boolean {
        return (
            annotation !== undefined &&
            annotation.transcriptConsequenceSummary !== undefined &&
            annotation.transcriptConsequenceSummaries !== undefined &&
            annotation.transcriptConsequenceSummaries.length > 1
        );
    }

    private transcriptsButton(isOpened: boolean) {
        return (
            <Toggle
                isOpen={isOpened}
                textWhenOpen="Close table"
                textWhenClosed="All transcripts"
                onToggle={this.onButtonClick}
            />
        );
    }

    private jsonButton() {
        return (
            <DefaultTooltip
                placement="top"
                overlay={
                    <span>
                        Click to view the raw API query response
                        <br />
                        <br />
                        Click{' '}
                        <a href="https://docs.genomenexus.org/api">here</a> for
                        more info about the API{' '}
                    </span>
                }
            >
                <Link
                    to={`/annotation/${
                        this.props.variant
                    }?fields=${annotationQueryFields().join(',')}`}
                    target="_blank"
                    style={{ paddingLeft: '8px', paddingRight: '8px' }}
                >
                    {'JSON '}
                    <i className="fa fa-external-link" />
                </Link>
            </DefaultTooltip>
        );
    }

    public generateBasicInfoReVUE(annotationSummary: VariantAnnotationSummary) {
        return (
            <DefaultTooltip
                placement="bottom"
                overlay={<ReVUEContent vue={this.props.annotation!.vues} />}
            >
                <span
                    className={classNames(basicInfo[`vue-wrapper`])}
                    style={{
                        paddingLeft: 3,
                        paddingTop: 2,
                        paddingBottom: 2,
                        paddingRight: 0,
                        marginLeft: -2,
                        marginRight: 4,
                    }}
                >
                    <a
                        href="https://cancerrevue.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none' }}
                    >
                        <img
                            src={require('./biologicalFunction/vue_logo.png')}
                            alt="reVUE logo"
                            width={22}
                            style={{ paddingRight: 5, marginTop: -2 }}
                        />
                        <span
                            style={{ color: '#8e7cc3' }}
                            className={classNames(basicInfo[`data-pills`])}
                        >
                            VUE
                        </span>
                        <span className={classNames(basicInfo[`data-pills`])}>
                            {annotationSummary.vues.revisedProteinEffect}
                        </span>
                        <span
                            className={classNames(
                                basicInfo[`data-pills`],
                                basicInfo[`inframe-mutation`]
                            )}
                        >
                            {
                                annotationSummary.vues
                                    .revisedVariantClassification
                            }
                        </span>
                    </a>
                </span>
            </DefaultTooltip>
        );
    }

    public generatePills(
        value: string | null,
        key: string,
        category: string | undefined
    ) {
        if (key === 'oncogene' || key === 'tsg') {
            const oncokbUrl = generateOncokbLink(ONCOKB_URL, this.props.oncokb);
            return (
                <DefaultTooltip
                    placement="top"
                    overlay={
                        <span>
                            As categorised by&nbsp;
                            <a
                                href={oncokbUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    OncoKB™
                                    <img
                                        height={12}
                                        src={require('./biologicalFunction/oncokb.png')}
                                        alt="oncokb"
                                    />
                                </span>
                            </a>
                        </span>
                    }
                >
                    <span
                        className={classNames(
                            basicInfo[`${category}`],
                            basicInfo[`data-pills`]
                        )}
                    >
                        <a
                            href={oncokbUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {value}
                        </a>
                    </span>
                </DefaultTooltip>
            );
        }
        return (
            <span
                className={classNames(
                    basicInfo[`${category}`],
                    basicInfo[`data-pills`]
                )}
            >
                {value}
            </span>
        );
    }

    public filterPillsByKey(keys: string[], renderData: BasicInfoData[]) {
        return renderData.filter((element) => keys.includes(element.key));
    }

    public getPillList(keys: string[], renderData: BasicInfoData[]) {
        return this.filterPillsByKey(keys, renderData).map((data) =>
            this.generatePills(data.value, data.key, data.category)
        );
    }

    @action
    onButtonClick = () => {
        this.showAllTranscripts = !this.showAllTranscripts;
    };
}

// logic is from react-mutation-mapper
function getMutationTypeClassName(
    transcript: TranscriptConsequenceSummary
): string {
    const value: MutationTypeFormat | undefined = getMapEntry(
        transcript.consequenceTerms
    );
    if (value && value.className) {
        return value.className;
    } else {
        return MAIN_MUTATION_TYPE_MAP['other'].className;
    }
}

// logic is from react-mutation-mapper
function getMapEntry(mutationType: string | undefined) {
    if (mutationType) {
        return MAIN_MUTATION_TYPE_MAP[getCanonicalMutationType(mutationType)];
    } else {
        return undefined;
    }
}

function getOncogeneFromOncokbGenesMap(
    oncokbGenesMap: { [hugoSymbol: string]: Gene },
    gene?: string
): string | null {
    return gene &&
        oncokbGenesMap[gene] &&
        oncokbGenesMap[gene].oncogene === true
        ? 'Oncogene'
        : null;
}

function getTsgFromOncokbGenesMap(
    oncokbGenesMap: { [hugoSymbol: string]: Gene },
    gene?: string
): string | null {
    return gene && oncokbGenesMap[gene] && oncokbGenesMap[gene].tsg === true
        ? 'TSG'
        : null;
}
